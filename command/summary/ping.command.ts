import { Command } from "../command.ts";
import { DiscordenoMessage } from "../../deps.ts";

const command: Command = {
  name: "ping",
  description: "Check the bot connection",
  category: "misc",
  arguments: [{ type: "message" }],
  execute: async (message: DiscordenoMessage) => {
    let ping = (Date.now() - message.timestamp) / 1000;
    throw {
      title: "Pong!",
      description: `The bot ping is \`${ping}\` seconds`
    };
  }
}

export default command;