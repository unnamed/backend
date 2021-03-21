import { Command } from "../command.ts";
import { Message, Member } from "../../deps.ts";
import config from "../../config.js";

const command: Command = {
  name: "avatar",
  category: "utility",
  aliases: ["profilepic"],
  description: "Look for someone's avatar",
  arguments: [
    { type: "message" },
    { 
      type: "member",
      name: "member",
      optional: true
    }
  ],
  execute: async (message: Message, member?: Member) => {
    if (!member) {
      member = message.member;
    }
    message.channel?.send({ 
      embed: {
        title: `Here's is the ${member?.username}'s avatar`,
        description: "Please don't weird things with this!",
        color: config.color,
        image: {
          url: member?.makeAvatarURL({
            size: 512,
            format: 'png'
          })
        },
        footer: {
          text: `Requested by ${message.author.username}`,
          icon_url: message.member?.avatarURL
        }
      }
    });
  }
};

export default command;