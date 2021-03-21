import { 
  Command, 
  CommandParameter, 
  ArgumentIterator, 
  ParseError
} from "./command.ts";
import { hasPermission } from "./command.util.ts";
import { answersCache } from "../storage/mod.ts";
import { Message } from "../deps.ts";
import { ArgumentParser } from "./argument/argument.parser.ts";
import config from "../config.js";

export const registry = new Map<string, Command>();

const aliasesRegistry = new Map<string, Command>();
export const argumentParsers = new Map<string, ArgumentParser>();

export function register(command: Command): void {
  registry.set(command.name, command);
  if (command.aliases) {
    command.aliases.forEach(alias => aliasesRegistry.set(alias, command));
  }
}

export function findCommand(commandLabel: string): Command | undefined {
  commandLabel = commandLabel.toLowerCase();
  return registry.get(commandLabel) || aliasesRegistry.get(commandLabel);
}

async function parse(message: Message, param: CommandParameter, args: ArgumentIterator): Promise<any> {

  let errorHeading = "";
  let errorMessage = "No types were specified for the parameter '" + param.name + "'";
  let throwOnLastArg = false;

  for (let type of param.type.split("|")) {
    type = type.trim();
    if (type === 'message') {
      return message;
    } else {
      let parser = argumentParsers.get(type);
      if (!parser) {
        errorHeading = "Unknown type";
        errorMessage = "No argument parser was registered for the type '" + type + "'";
      } else {
        try {
          return await parser.parse(message, param, args);
        } catch (err) {
          if (err instanceof ParseError) {
            errorHeading = err.heading;
            errorMessage = err.message;
            throwOnLastArg = err.throwOnLastArg;
          } else {
            throw err;
          }
        }
      }
    }
  }

  throw new ParseError(errorHeading, errorMessage, throwOnLastArg);
}

export async function dispatch(message: Message, args: string[]): Promise<void> {

  let commandLabel = args.shift()?.toLowerCase() as string;
  let command: Command | undefined = findCommand(commandLabel);
  let guild = message.guild;
  let member = message.member;

  if (!guild || !member) {
    return;
  }

  if (!command) {
    let embedResponse = await answersCache.find([guild.id, commandLabel]);
    if (embedResponse) {
      message.channel?.send({ embed: embedResponse });
    }
    return;
  }

  if (!(await hasPermission(message, command))) {
    message.channel?.send({
      embed: {
        title: "No Permission!",
        description: "Sorry, the bot or you doesn't have the required permissions to execute/use the command :(",
        color: config.color,
        footer: {
          text: `Executed by ${message.author.username}`,
          icon_url: guild.iconURL(64, 'png')
        }
      }
    });
    return;
  }

  let commandArguments = command.arguments || [];
  let parseResult = [];
  let argIterator = new ArgumentIterator(args);

  for (let i = 0; i < commandArguments.length; i++) {
    let param = commandArguments[i];
    let cursorSnapshot = argIterator.cursor;

    try {
      parseResult.push(await parse(message, param, argIterator));
    } catch (err) {
      if (err instanceof ParseError) {
        if (!param.optional || ((i + 1 == commandArguments.length) && err.throwOnLastArg)) {
          message.channel?.send({
            embed: {
              title: `Parsing Error: ${err.heading}`,
              description: err.message,
              color: config.color
            }
          });
          return;
        } else {
          argIterator.cursor = cursorSnapshot;
          parseResult.push(param.defaultValue);
          continue;
        }
      } else {
        throw err;
      }
    }
  }

  command.execute.apply(undefined, parseResult).catch(err => {
    let { heading, description } = err;
    if (heading || description) {
      message.channel?.send({
        embed: {
          title: heading,
          description: description,
          color: config.color,
          footer: {
            text: `Requested by ${message.author.username}`,
            icon_url: message.member?.avatarURL
          }
        }
      });
    } 
  });
}