import test from "node:test";
import assert from "node:assert/strict";
import { filterChatMessages } from "../shared/chat.js";

test("chat audience switches only bot public messages while keeping team privacy", () => {
  const players = [
    { id: "human", bot: false },
    { id: "bot", bot: true },
  ];
  const messages = [
    { id: "human-public", player: "human", team: null },
    { id: "bot-public", player: "bot", team: null },
    { id: "marked-bot", player: "legacy-bot", bot: true, team: null },
    { id: "other-team", player: "human", team: "2" },
    { id: "my-team", player: "human", team: "1" },
  ];

  assert.deepEqual(
    filterChatMessages(messages, players, { audience: "players" }).map(
      (message) => message.id,
    ),
    ["human-public"],
  );
  assert.deepEqual(
    filterChatMessages(messages, players, {
      audience: "players-and-bots",
    }).map((message) => message.id),
    ["human-public", "bot-public", "marked-bot"],
  );
  assert.deepEqual(
    filterChatMessages(messages, players, {
      audience: "players-and-bots",
      team: "1",
    }).map((message) => message.id),
    ["my-team"],
  );
});
