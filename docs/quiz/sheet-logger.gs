// Meaning Quiz -> Google Sheet logger (Apps Script).
//
// HOW TO DEPLOY (one time):
// 1. Open the "Meaning Quiz Responses" Sheet.
// 2. Extensions > Apps Script.
// 3. Delete whatever is there, paste ALL of this, click Save.
// 4. Deploy > New deployment > gear icon > Web app.
//    - Description: anything
//    - Execute as: Me (adham@lightnet.org)
//    - Who has access: Anyone
//    - Deploy. Authorize when asked (Advanced > Go to project > Allow).
// 5. Copy the Web app URL it gives you and send it to Claude.

// Set this to a random string, and store the SAME value as the SHEETS_SECRET
// secret in Supabase. (Kept out of this public repo on purpose.)
var SECRET = "PASTE_YOUR_SECRET_HERE";
var SHEET_NAME = "Responses";

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return out({ error: "unauthorized" });
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (body.action === "append") {
      sheet.appendRow([
        body.timestamp || new Date().toISOString(),
        body.responseId, body.type, body.presence, body.search,
        body.a1, body.a2, body.a3, body.a4, body.a5,
        body.a6, body.a7, body.a8, body.a9, body.a10,
        "", ""
      ]);
      return out({ ok: true });
    }

    if (body.action === "setEmail") {
      var last = sheet.getLastRow();
      if (last >= 2) {
        var ids = sheet.getRange(2, 2, last - 1, 1).getValues(); // column B (Response ID)
        for (var i = 0; i < ids.length; i++) {
          if (ids[i][0] === body.responseId) {
            var r = i + 2;
            sheet.getRange(r, 16).setValue(body.email);                                  // P: Email
            sheet.getRange(r, 17).setValue(body.emailAt || new Date().toISOString());     // Q: Email At
            return out({ ok: true, row: r });
          }
        }
      }
      // response row not found: append one so the email is never lost
      sheet.appendRow([new Date().toISOString(), body.responseId, "", "", "",
        "", "", "", "", "", "", "", "", "", "", body.email, body.emailAt || new Date().toISOString()]);
      return out({ ok: true, appended: true });
    }

    return out({ error: "unknown action" });
  } catch (err) {
    return out({ error: String(err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
