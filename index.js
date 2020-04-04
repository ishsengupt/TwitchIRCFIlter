var Twit = require("twit");
const express = require("express");
const app = express();
const server = require("http").Server(app);
var io = require("socket.io")(server);
var fs = require("fs");
const tmi = require("tmi.js");
const syllables = require("syllables");
const options = require("./options");
const rs = require("text-readability");
var Sentiment = require("sentiment");
var sentiment = new Sentiment();
var bodyParser = require("body-parser");
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true
  })
);

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));
const client = new tmi.client(options);
client.connect();

function sentencesCount(msg) {
  const desiredMatch = msg.match(/\./g);
  if (desiredMatch == null) {
    return 0;
  } else {
    const sentenceLength = desiredMatch.length;
    return sentenceLength;
  }
}

function wordCount(msg) {
  return msg.split(" ").length;
}

function syllableCount(msg) {
  /*   var count = 0;
      const wordsArray = msg.split(" ");
      for (words in wordsArray) {
        word = word.toLowerCase();
        if (word.length <= 3) {
          return 1;
        }
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
        word = word.replace(/^y/, "");
        const sylcount = word.match(/[aeiouy]{1,2}/g).length;
        count = count + sylcount;
      }
      return count; */
  return syllables(msg);
}

io.on("connection", function(socket) {
  client.on("chat", (channel, user, message, self) => {
    if (self) return;
    //const msgString = `<${channel}> ${user["display-name"]} ${message} ${user["color"]}`;

    //${user["badges"].subscriber
    const msgInfo = {
      channel: channel,
      dispName: user["display-name"],
      message: message,
      msgColor: user["color"],
      fleschRE: rs.fleschReadingEase(message),
      colemanLI: rs.colemanLiauIndex(message),
      daleCRS: rs.daleChallReadabilityScore(message),
      gunningFog: rs.gunningFog(message),
      sentiment: sentiment.analyze(message).score
    };

    io.emit("tweet", { message: msgInfo });
    //console.log(msgInfo);

    //  console.log(msgInfo.msgColor == null);

    //console.log(msgInfo);
  });
});

app.get("/mods-api/channels/:channel", (req, res) => {
  if (client.readyState() !== "OPEN") {
    return res.json({
      error: "Service Unavailable",
      status: 503,
      message: "Not ready"
    });
  }
  let channel = req.params.channel.toLowerCase();
  client
    .mods(channel)
    .then(moderators => {
      res.json({
        channel,
        moderators
      });
    })
    .catch(err => {
      res.json({
        error: "Internal Server Error",
        status: 500,
        message: "Some error occurred"
      });
    });
});

// listen for requests :)
const listener = server.listen(7000, function() {
  console.log("Your app is listening on port " + "7000");
});
