import { Command } from "../command.ts";
import { Message, EmbedField } from "../../deps.ts";
import { registry, findCommand, getUsage } from "../command.manager.ts";
import config from "../../config.ts";
import { capitalizeFirst } from "../../util/mod.ts";

const command: Command = {
  name: "help",
  category: "misc",
  description: "Show this help message",
  arguments: [
    { type: 'message' },
    {
      type: 'str',
      name: 'command',
      optional: true
    }
  ],
  execute: async (message: Message, commandName?: string) => {
    
    let channel = message.channel;
    
    if (!channel) {
      return;
    }

    if (commandName) {
      let command = findCommand(commandName);
      if (!command) {
        throw {
          heading: "Unknown Command",
          description: `Command not found: ${commandName}. No help for this command`
        };
      }
      channel.send({
        embed: {
          title: `Command \`-${commandName}\``,
          description: command.description,
          color: config.color,
          fields: [
            {
              name: "Usage",
              value: "Type `" + getUsage(command) + "`"
            }
          ]
        }
      })
    } else {
      // commands by category
      let commandsByCategory = new Map<string, string[]>();
      registry.forEach((command, name) => {
        if (command.category !== 'hidden') {
          let commands = commandsByCategory.get(command.category) || [];
          commands.push(name);
          commandsByCategory.set(command.category, commands);
        }
      });

      let fields: EmbedField[] = [];
      commandsByCategory.forEach((commands, category) => {
        fields.push({
          name: capitalizeFirst(category),
          value: commands.map(name => `\`${name}\``).join(", "),
          inline: true
        });
      });

      channel.send({
        embed: {
          title: "Command Index",
          description: "Here are all the possible commands",
          fields
        }
      });
    }
  }
};

export default command;