var pull = require('pull-stream');
var MutantPullReduce = require('mutant-pull-reduce');

module.exports = (sbot) => {

  function latestGameMessageForPlayerObs(playerId) {

    var chessMessagesReferencingPlayer = chessMessagesForPlayerGames(playerId, Date.now());

    return MutantPullReduce(chessMessagesReferencingPlayer, (state, next) => {
      return next;
    }, {
      nextTick: true,
      sync: true
    });
  }

  function chessMessagesForPlayerGames(playerId, since) {
    var liveFeed = sbot.createFeedStream({
      live: true,
      gt: since
    })

    return pull(liveFeed, msgReferencesPlayerFilter(playerId))
  }

  function getGameInvite(msg, cb) {

    if (msg.value.content.type === "chess_invite") {
      return getInviteOrWarn(null, msg.value, cb)
    }
    else if (!msg.value || !msg.value.content || !msg.value.content.root) {
      console.warn("No root found for chess message ");
      console.warn(msg);
      cb(null, []);
    } else {
      var gameId = msg.value.content.root;
      sbot.get(gameId, (err, result) => getInviteOrWarn(err, result, cb));
    }
  }

  function getInviteOrWarn(err, result, cb) {
    if (err) {
        console.warn("Error while retrieving game invite message");
        console.warn(err);
        cb(null, null);
    }
    else if (result.content.type !== "chess_invite") {
      console.warn("Unexpectedly not a chess invite root ");
      console.warn(result);
      cb(null, null);
    }
    else if (!result.content.inviting) {
      console.warn("Unexpectedly no invitee")
      console.warn(result);
    } else {
      cb(null, result)
    }
  }

  function isChessMessage(msg) {
    if (!msg.value || !msg.value.content) {
      return false;
    }
    else {
      return [
       "chess_move",
       "chess_invite_accept",
       "chess_game_end"].indexOf(msg.value.content.type) !== -1
    }

  }

  function containsPlayerId(playerId, players) {
    return players.indexOf(playerId) !== -1;
  }

  function msgReferencesPlayerFilter(playerId) {
    return pull(
            pull(
              pull.filter(isChessMessage),
              pull.asyncMap(getGameInvite)
            ),
            pull.filter(msg =>
               msg == null ||
                [msg.author, msg.content.invitee].indexOf !== -1)
          )
  }

  return {
   /**
    * Watches for incoming updates to a player's games and sets the observable
    * value to the last message.
    */
   latestGameMessageForPlayerObs : latestGameMessageForPlayerObs,
   chessMessagesForPlayerGames: chessMessagesForPlayerGames
  }
}
