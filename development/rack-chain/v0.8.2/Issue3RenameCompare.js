autowatch = 1;
inlets = 1;
outlets = 3;

// Instrumented Issue 3 refresh coordinator. There is deliberately one
// stateGeneration and one active request; requests are correlated by the
// single-flight rule and their per-slot collector.
var observerToId = {};
var pendingNames = {};
var nameById = {};
var activeIds = [];
var stateGeneration = 0;
var activeRequest = null;
var dirty = false;
var currentChainCount = 0;
var pendingRenames = {};
var startScheduled = false;
var MAX_UPDATE_ATTEMPTS = 2;
var startTask = new Task(startRefresh, this);

function emitLog(label, args) {
  var message = [0, label];
  var i;
  for (i = 0; i < args.length; i++) message.push(args[i]);
  outlet.apply(this, message);
}
function idKey(value) { return String(value); }
function indexOfValue(values, value) {
  var i;
  for (i = 0; i < values.length; i++) if (String(values[i]) === String(value)) return i;
  return -1;
}
function sameIds(a, b) {
  var i;
  if (!a || !b || a.length !== b.length) return false;
  for (i = 0; i < a.length; i++) if (String(a[i]) !== String(b[i])) return false;
  return true;
}
function pendingCount() {
  var count = 0;
  var key;
  for (key in pendingRenames) if (pendingRenames.hasOwnProperty(key)) count++;
  return count;
}
function parseTopology(args) {
  var ids = [];
  var i;
  for (i = 0; i + 1 < args.length; i++) {
    if (String(args[i]) === "id") ids.push(String(args[i + 1]));
  }
  return ids;
}
function topologyMessage(args) {
  var nextIds = parseTopology(args);
  var changed = !sameIds(activeIds, nextIds);
  var keep = {};
  var i, key;
  for (i = 0; i < nextIds.length; i++) keep[nextIds[i]] = true;
  if (changed) {
    stateGeneration++;
    for (i = 0; i < activeIds.length; i++) {
      key = activeIds[i];
      if (!keep[key]) {
        delete nameById[key];
        if (pendingRenames[key]) {
          emitLog("idrename_pending_cancelled_removed_chain", [key, pendingRenames[key].newName]);
          delete pendingRenames[key];
        }
      }
    }
    activeIds = nextIds;
    emitLog("idrename_topology_changed", [stateGeneration, activeIds.length, activeIds.join(",")]);
    requestRefresh("topology");
  } else {
    emitLog("idrename_topology_unchanged", [stateGeneration, activeIds.length]);
  }
}
function requestRefresh(reason) {
  emitLog("idrename_refresh_requested", [reason, stateGeneration, activeRequest ? activeRequest.id : "none"]);
  if (activeRequest) {
    if (!dirty) emitLog("idrename_request_dirty", [activeRequest.id, reason, stateGeneration]);
    dirty = true;
    return;
  }
  scheduleStart();
}
function scheduleStart() {
  if (startScheduled) return;
  startScheduled = true;
  startTask.schedule(0);
}
function startRefresh() {
  startScheduled = false;
  if (activeRequest) {
    dirty = true;
    emitLog("idrename_request_dirty", [activeRequest.id, "start_collision", stateGeneration]);
    return;
  }
  if (currentChainCount < 1 || currentChainCount > 8 || activeIds.length !== currentChainCount) {
    emitLog("idrename_refresh_waiting_topology", [currentChainCount, activeIds.length, stateGeneration]);
    return;
  }
  var req = {
    id: "active",
    stateGeneration: stateGeneration,
    count: currentChainCount,
    ids: activeIds.slice(0),
    slots: [],
    pendingKeys: [],
    phase: "collecting",
    range: null
  };
  var key, initialIds = [], retryIds = [], renameNames = [], attemptedCount = 0;
  for (key in pendingRenames) {
    if (pendingRenames.hasOwnProperty(key)) {
      req.pendingKeys.push(key);
      if (!pendingRenames[key].exhausted) {
        attemptedCount++;
        pendingRenames[key].inFlight = true;
        pendingRenames[key].attempts++;
        if (pendingRenames[key].attempts > 1) retryIds.push(pendingRenames[key].id);
        else initialIds.push(pendingRenames[key].id);
        renameNames.push(pendingRenames[key].newName);
      }
    }
  }
  var i;
  for (i = 0; i < req.count; i++) req.slots.push({ slot: i, id: null, name: null, hasId: false, hasName: false });
  activeRequest = req;
  emitLog("idrename_request_started", [req.id, req.stateGeneration, req.count, req.ids.join(","), req.pendingKeys.join(",")]);
  emitLog("idrename_request_snapshot", [req.id, req.stateGeneration, req.count, req.ids.join(",")]);
  if (attemptedCount) {
    emitLog("idrename_update_requested", [req.pendingKeys.join(","), renameNames.join("|"), req.count, initialIds.join(","), retryIds.join(",")]);
    emitLog("idrename_saved_chain_count_resent", [req.count, req.pendingKeys.join(","), initialIds.join(","), retryIds.join(",")]);
    if (retryIds.length) emitLog("idrename_retry_requested", [retryIds.join(","), req.count, MAX_UPDATE_ATTEMPTS]);
  }
  // Outlet 1 enters the existing int -> v72_sel route.
  outlet(1, req.count);
}
function targetMessage(args) {
  if (args.length < 3) return;
  var observer = String(args[0]);
  var slot = Number(observer);
  var id = String(args[2]);
  var oldId = observerToId[observer];
  observerToId[observer] = id;
  emitLog("idrename_target_map", [observer, id, oldId === undefined ? "new" : oldId]);
  if (activeRequest && activeRequest.phase === "collecting" && slot >= 0 && slot < activeRequest.count) {
    var response = activeRequest.slots[slot];
    response.id = id;
    response.hasId = true;
    if (id === "0") { response.name = ""; response.hasName = true; }
    emitLog("idrename_slot_id_response", [activeRequest.id, slot, id]);
    checkBarrier();
  }
  if (pendingNames[observer] !== undefined) {
    var queuedName = pendingNames[observer];
    delete pendingNames[observer];
    processName(observer, queuedName);
  }
}
function nameMessage(args) {
  if (args.length < 2) return;
  var observer = String(args[0]);
  var name = String(args.slice(1).join(" "));
  if (observerToId[observer] === undefined) {
    pendingNames[observer] = name;
    emitLog("idrename_name_waiting_target", [observer, name]);
    return;
  }
  processName(observer, name);
}
function processName(observer, name) {
  var id = observerToId[observer];
  var slot = Number(observer);
  if (slot < 0 || slot >= activeIds.length || String(id) !== String(activeIds[slot])) {
    emitLog("idrename_observer_mapping_suppressed", [observer, id, slot < 0 ? "invalid" : activeIds[slot], name]);
    // Do not alter baseline: the observer may currently belong to a different
    // slot while Live is applying a reorder.
    return;
  }
  var key = idKey(id);
  if (nameById[key] === undefined) {
    nameById[key] = name;
    emitLog("idrename_baseline", [id, name, observer]);
    return;
  }
  var previous = nameById[key];
  if (previous === name) {
    emitLog("idrename_same_ignored", [id, name, observer]);
    return;
  }
  nameById[key] = name;
  pendingRenames[key] = {
    id: id, oldName: previous, newName: name, observer: observer,
    attempts: 0, inFlight: false, exhausted: false
  };
  stateGeneration++;
  emitLog("idrename_candidate", [id, previous, name, observer, stateGeneration]);
  emitLog("idrename_pending_created", [id, name, pendingCount()]);
  requestRefresh("rename");
}
function snapshotNameMessage(args) {
  if (args.length < 2 || !activeRequest || activeRequest.phase !== "collecting") return;
  var slot = Number(args[0]);
  if (slot < 0 || slot >= activeRequest.count) return;
  var slotResponse = activeRequest.slots[slot];
  slotResponse.name = String(args.slice(1).join(" "));
  slotResponse.hasName = true;
  emitLog("idrename_slot_name_response", [activeRequest.id, slot, slotResponse.id, slotResponse.name]);
  checkBarrier();
}
function snapshotValid(req) {
  var i, slot;
  if (req.stateGeneration !== stateGeneration || req.count !== currentChainCount ||
      !sameIds(req.ids, activeIds) || req.slots.length !== req.count) return false;
  for (i = 0; i < req.count; i++) {
    slot = req.slots[i];
    if (!slot.hasId || !slot.hasName || String(slot.id) !== String(req.ids[i])) return false;
  }
  return true;
}
function checkBarrier() {
  var req = activeRequest;
  if (!req || req.phase !== "collecting") return;
  var i;
  for (i = 0; i < req.count; i++) if (!req.slots[i].hasId || !req.slots[i].hasName) return;
  emitLog("idrename_barrier_completed", [req.id, req.count, "slots_complete"]);
  if (!snapshotValid(req)) {
    emitLog("idrename_stale_request_discarded", [req.id, req.stateGeneration, stateGeneration, req.ids.join(","), activeIds.join(",")]);
    for (i = 0; i < req.pendingKeys.length; i++) {
      if (pendingRenames[req.pendingKeys[i]]) pendingRenames[req.pendingKeys[i]].inFlight = false;
    }
    finishRequest("stale");
    return;
  }
  var names = [];
  for (i = 0; i < req.count; i++) names.push(req.slots[i].name);
  for (i = 0; i < req.pendingKeys.length; i++) {
    var key = req.pendingKeys[i], candidate = pendingRenames[key];
    if (candidate && names[indexOfValue(req.ids, candidate.id)] !== candidate.newName) {
      candidate.inFlight = false;
      emitLog("idrename_selector_mismatch", [candidate.id, candidate.newName,
        names[indexOfValue(req.ids, candidate.id)], candidate.attempts, "barrier"]);
      if (candidate.attempts >= MAX_UPDATE_ATTEMPTS) {
        if (!candidate.exhausted) {
          candidate.exhausted = true;
          emitLog("idrename_retry_exhausted", [candidate.id, candidate.newName, candidate.attempts, MAX_UPDATE_ATTEMPTS]);
        }
      } else {
        requestRefresh("rename_retry");
      }
      finishRequest("rename_mismatch");
      return;
    }
  }
  req.phase = "awaiting_commit";
  req.range = names.slice(0);
  emitLog("idrename_commit_gate_passed", [req.id, req.stateGeneration, req.count, req.ids.join(",")]);
  // Outlet 2 is routed to exactly one existing v72_rangeN.
  outlet.apply(this, [2, "commit", req.count].concat(names));
}
function selectorMessage(args) {
  if (args.length < 2 || !activeRequest || activeRequest.phase !== "awaiting_commit") return;
  var range = Number(args[0]);
  if (String(args[1]) !== "_parameter_range") return;
  var names = [], i;
  for (i = 2; i < args.length; i++) names.push(String(args[i]));
  var req = activeRequest;
  if (range !== req.count || !sameIds(req.ids, activeIds) || req.stateGeneration !== stateGeneration ||
      names.length !== req.count || !sameIds(names, req.range)) {
    emitLog("idrename_commit_feedback_rejected", [req.id, range, req.count, req.stateGeneration, stateGeneration]);
    finishRequest("commit_feedback_stale");
    return;
  }
  emitLog("idrename_range_committed", [req.id, req.stateGeneration, range, req.ids.join(","), names.join("|")]);
  for (i = 0; i < req.pendingKeys.length; i++) {
    var key = req.pendingKeys[i], candidate = pendingRenames[key];
    if (!candidate) continue;
    var index = indexOfValue(req.ids, candidate.id);
    if (index >= 0 && names[index] === candidate.newName) {
      delete pendingRenames[key];
      emitLog("idrename_ack_selector_matches", [candidate.id, candidate.newName, "committed_range", candidate.attempts]);
      emitLog("idrename_pending_completed", [candidate.id, candidate.newName, pendingCount()]);
    } else {
      candidate.inFlight = false;
    }
  }
  finishRequest("committed");
}
function finishRequest(result) {
  var completed = activeRequest;
  if (!completed) return;
  emitLog("idrename_request_completed", [completed.id, result, dirty ? 1 : 0]);
  activeRequest = null;
  if (dirty) {
    dirty = false;
    emitLog("idrename_dirty_refresh_started", [stateGeneration, currentChainCount, activeIds.join(",")]);
    scheduleStart();
  } else {
    // A mismatch or a candidate arriving after this request began needs a
    // later attempt even if no external count event arrives.
    var hasRetry = false, key;
    for (key in pendingRenames) if (pendingRenames.hasOwnProperty(key) && !pendingRenames[key].inFlight && !pendingRenames[key].exhausted) hasRetry = true;
    if (hasRetry && result === "rename_mismatch") scheduleStart();
  }
}
function countMessage(args) {
  if (!args.length) return;
  var nextCount = Number(args[0]);
  currentChainCount = nextCount;
  emitLog("idrename_chain_count_saved", [currentChainCount, stateGeneration]);
  requestRefresh("chaincount_div2");
}
function anything() {
  var args = arrayfromargs(messagename, arguments);
  var command = String(args.shift());
  if (command === "target") targetMessage(args);
  else if (command === "name") nameMessage(args);
  else if (command === "snapshot_name") snapshotNameMessage(args);
  else if (command === "topology") topologyMessage(args);
  else if (command === "selector") selectorMessage(args);
  else if (command === "count") countMessage(args);
}
function loadbang() { emitLog("idrename_comparator_loaded", ["Issue3RenameCompare.js"]); }
