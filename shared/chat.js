export function filterChatMessages(
  messages = [],
  players = [],
  { audience = "players", team = null } = {},
) {
  const playersById = new Map(players.map((player) => [player.id, player]));
  return messages.filter((message) => {
    if (team != null) return message.team === String(team);
    if (message.team) return false;
    const senderIsBot =
      message.bot === true || playersById.get(message.player)?.bot === true;
    return audience !== "players" || !senderIsBot;
  });
}
