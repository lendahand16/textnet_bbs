import { ensureDir } from "../../lib/std/fs/ensure_dir.ts";

enum SpecialChars {
	CR = '\r',
	LF = '\n',
	CRLF = '\r\n',
	END = '\u001A'
}

const SERVER_CAT = "#000-000";
const TXT_DEC = new TextDecoder();
const TXT_ENC = new TextEncoder();

/*

Needs:
Command Parser
Standard Commands
Better Messaging Functions
Command Buffer
Command Status?
DONE: Quitter Function




mail@192.186.0.1#001-000:
----------------------------------------------------------------
ABOUT / MAIL / WRITE / REMOVE / AMMEND / QUIT
----------------------------------------------------------------
<a> ::= 52 letters, a to z and A to Z
<d> ::= one of ten digits 0 through 9
<cat-tag> ::= "#" <d> <d> <d> "-" <d> <d> <d>
<name> ::= <a> { (<a>|<d>) }
<path> ::= [ name ] <cat-tag>
----------------------------------------------------------------
telnet 192.168.0.1 25
C: MAIL
S: 200 OK
C: FROM:#001-000
C: TO:#002-000
C: MSG
C: Subject: Hello
C: 
C: Wow!
C: .

*/

async function setPrompt(conn: Deno.Conn, username: string) {
	await conn.write(TXT_ENC.encode(`${username}> `));
}

async function sendMessage(conn: Deno.Conn, message: string, author?: string) {
	if (author) await conn.write(TXT_ENC.encode(`${author}> ${message}`+SpecialChars.CRLF));
	else await conn.write(TXT_ENC.encode(message+SpecialChars.CRLF));
}

async function * readlines(conn: Deno.Conn) {
	const charBuffer = new Uint8Array(1);
	let lineBuffer = "";
	let newlineStatus = 0;
	for (;;) {
		if ((await conn.read(charBuffer)).nread > 0) {
			const c = TXT_DEC.decode(charBuffer)
			if (c === SpecialChars.END) {
				return SpecialChars.END;
			}
			if (c === SpecialChars.CR || c === SpecialChars.LF) {
				newlineStatus++;
				if (newlineStatus > 1) {
					yield lineBuffer;
					lineBuffer = "";
					newlineStatus = 0;
				};
			} else {
				newlineStatus = 0;
				lineBuffer += c;
			}
		}
	}
}


/* CLI Commands */
namespace Commands {

	export async function help(conn: Deno.Conn, lineSplit: string[]) {
		await sendMessage(conn, 
			"HELP: Shows this help."+SpecialChars.CRLF+
			"QUIT: Exit the session."+SpecialChars.CRLF+
			"SMS:  Send a short messsage."+SpecialChars.CRLF+
			"MOTD: Message of the day."
		);
	}
	
	export async function motd(conn: Deno.Conn, lineSplit: string[]) {
		await sendMessage(conn, "Roses are red."+SpecialChars.CRLF+"My screen is blue."+SpecialChars.CRLF+"I can only think to myself,"+SpecialChars.CRLF+"What on Earth did I do?");
	}
	
	export async function sms(conn: Deno.Conn, lineSplit: string[]) {
		let addr = lineSplit[1];
		let uid = "000";
		if (addr && addr.startsWith("#") && addr.endsWith("-000") && addr.length === 8) {
			uid = addr.slice(1,4);
			await ensureDir("./uid/"+uid);
			if (lineSplit[2]) {
				await Deno.writeFile("./uid/"+uid+"/"+String(new Date().valueOf())+".txt",TXT_ENC.encode(lineSplit.slice(2).join(" ")));
			}
		} else {
			await sendMessage(conn, "Bad Address Line. Format: #uid-000", SERVER_CAT);
		}
		//await sendMessage(conn, "Short Message Service :"+lineSplit.slice(1).join(" "), SERVER_CAT);
	}
	
	export async function mail(conn: Deno.Conn) {
		await sendMessage(conn, "Mail Time!", SERVER_CAT);
	}
	
	export async function library(conn: Deno.Conn) {
	
	}
	
	export async function page(conn: Deno.Conn) {
	
	}
	
	export async function write(conn: Deno.Conn) {
	
	}
	
	export async function ammend(conn: Deno.Conn) {
	
	}
	
	export async function remove(conn: Deno.Conn) {
	
	}
}

async function commandHandler(conn: Deno.Conn, line: string) {
	
	const lineSplit = line.split(" ");
	const commandIdentifier = lineSplit[0].toLowerCase();

	switch (commandIdentifier) {
		case "help": await Commands.help(conn, lineSplit); break;
		case "sms": await Commands.sms(conn, lineSplit); break;
		case "motd": await Commands.motd(conn, lineSplit); break;
		default: break;
	}

}

async function connectionThread(conn: Deno.Conn, sessID: number) {

	const promptText = "cid-"+String(sessID).padStart(3,'0');

	console.log("OPEN ID:"+sessID);
	await setPrompt(conn, promptText);

	for await (const line of readlines(conn)) {
		if (line === "QUIT" || line === "quit" || line === SpecialChars.END) break;
		await commandHandler(conn, line);
		await setPrompt(conn, promptText);
	}
	
	await sendMessage(conn, "Bye Bye!", SERVER_CAT);
	conn.close();
	console.log("QUIT ID:"+sessID);

	/*
	OLD
	if (line === SpecialChars.END) break;
	if (line === "QUIT") break;
	console.log("Conn#"+sessID+">", line+"<CRLF>");

	if (cStat > 0) {
		switch (cmd) {
			case "MAIL":
				[cBuf, cStat] = await cmd_mail(conn, cBuf, cStat);
				break;
			case "SMS":
				[cBuf, cStat] = await cmd_sms(conn, cBuf, cStat);
				break;
			default:
				cmd = "";
				cBuf = "";
				cStat = 0;
				await setPrompt(conn, "cid-"+String(id));
				break;
		}
	} else {
	//}
	if (line === "HELP") {
		await cmd_help(conn);
	} else if (line === "MOTD") {
		await cmd_motd(conn);
	}
	await setPrompt(conn, "cid-"+sessID);*/
}

async function main() {
	let sessID = 0;
	const server = Deno.listen("tcp", "0.0.0.0:25");
	console.log("Server Started. Listening on PORT 25");
	for await (const conn of server) {
		connectionThread(conn, sessID++);
	}
}
main();
