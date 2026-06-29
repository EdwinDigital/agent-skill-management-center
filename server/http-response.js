export function canWriteJsonResponse(response, request) {
  return Boolean(response)
    && !response.headersSent
    && !response.writableEnded
    && !response.destroyed
    && !request?.aborted
    && !request?.destroyed;
}

export function sendJsonIfWritable(response, request, payload) {
  if (!canWriteJsonResponse(response, request)) {
    return false;
  }

  try {
    response.json(payload);
    return true;
  } catch (error) {
    if (!canWriteJsonResponse(response, request) || isClosedResponseStreamError(error)) {
      return false;
    }
    throw error;
  }
}

function isClosedResponseStreamError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.includes("stream was destroyed") || message.includes("socket hang up") || message.includes("write after end");
}