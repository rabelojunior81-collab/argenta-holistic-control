/**
 * mc mcp — Gerenciamento de servidores MCP (Model Context Protocol)
 * 
 * Uso:
 *   mc mcp list                    Lista servidores MCP
 *   mc mcp status                  Status da integração MCP
 *   mc mcp add <nome> [options]    Adiciona servidor MCP
 *   mc mcp remove <nome>           Remove servidor MCP
 *   mc mcp enable <nome>           Habilita servidor MCP
 *   mc mcp disable <nome>          Desabilita servidor MCP
 *   mc mcp tools [server]          Lista ferramentas disponíveis
 *   mc mcp invoke <srv> <tool>     Invoca ferramenta MCP
 */
import { C, api, section, kv, paint } from "../mc.mjs";

export async function run(args, flags) {
  const [subcmd, ...rest] = args;

  switch (subcmd) {
    case "list":
      return await cmdList();
    case "status":
      return await cmdStatus();
    case "add":
      return await cmdAdd(rest, flags);
    case "remove":
    case "rm":
      return await cmdRemove(rest);
    case "enable":
      return await cmdToggle(rest, true);
    case "disable":
      return await cmdToggle(rest, false);
    case "tools":
      return await cmdTools(rest);
    case "invoke":
      return await cmdInvoke(rest);
    case "help":
    default:
      printHelp();
  }
}

function printHelp() {
  console.log(`
${paint(C.bold + C.lime, "mc mcp")} — Gerenciamento MCP

${paint(C.bold, "Uso:")} mc mcp <comando> [args] [--flags]

${paint(C.bold, "Comandos:")}
  ${paint(C.lime, "list")}                    Lista servidores MCP configurados
  ${paint(C.lime, "status")}                  Status da integração MCP
  ${paint(C.lime, "add <nome>")}              Adiciona servidor MCP
  ${paint(C.lime, "remove <nome>")}           Remove servidor MCP
  ${paint(C.lime, "enable <nome>")}           Habilita servidor MCP
  ${paint(C.lime, "disable <nome>")}          Desabilita servidor MCP
  ${paint(C.lime, "tools [servidor]")}        Lista ferramentas disponíveis
  ${paint(C.lime, "invoke <srv> <tool>")}     Invoca ferramenta MCP

${paint(C.bold, "Flags para 'add':")}
  ${paint(C.gray, "--type <local|remote>")}   Tipo do servidor (padrão: local)
  ${paint(C.gray, "--cmd <comando>")}         Comando para servidor local
  ${paint(C.gray, "--url <url>")}             URL para servidor remoto
  ${paint(C.gray, "--desc <descricao>")}      Descrição do servidor

${paint(C.bold, "Exemplos:")}
  mc mcp list
  mc mcp add filesystem
  mc mcp add my-api --type remote --url http://localhost:3000/mcp
  mc mcp enable filesystem
  mc mcp tools filesystem
  mc mcp invoke filesystem read_file '{"path":"./package.json"}'
`);
}

async function cmdList() {
  const servers = await api("/mcp/servers").catch(() => []);
  
  section("SERVIDORES MCP");
  
  if (servers.length === 0) {
    console.log(`  ${paint(C.gray, "— nenhum servidor configurado —")}`);
    console.log(`  ${paint(C.gray, "Use 'mc mcp add <nome>' para adicionar")}`);
    return;
  }

  const enabled = servers.filter(s => s.enabled).length;
  console.log(`  ${paint(C.gray, "Total:")} ${servers.length}  ${paint(C.gray, "Ativos:")} ${paint(C.lime, enabled)}  ${paint(C.gray, "Inativos:")} ${servers.length - enabled}\n`);

  for (const s of servers) {
    const dot = s.enabled ? paint(C.lime, "●") : paint(C.gray, "○");
    const name = paint(C.white, s.name.padEnd(16));
    const type = paint(C.gray, (s.type || "local").padEnd(8));
    const desc = paint(C.gray, s.description || "—");
    console.log(`  ${dot} ${name} ${type} ${desc}`);
  }
  console.log();
}

async function cmdStatus() {
  const status = await api("/mcp/status").catch(() => ({}));
  
  section("STATUS MCP");
  
  const healthy = status.kiloServe?.healthy;
  const kiloStr = healthy 
    ? paint(C.lime, "✓ online") 
    : paint(C.red, "✗ offline");
  
  kv("Kilo Serve", `${kiloStr} ${paint(C.gray, status.kiloServe?.baseUrl || "")}`);
  kv("Config Path", status.configPath || "—");
  kv("Servidores", `${status.servers?.total || 0} total, ${paint(C.lime, String(status.servers?.enabled || 0))} ativos`);
  
  console.log();
}

async function cmdAdd(args, flags) {
  const [name] = args;
  
  if (!name) {
    console.error(paint(C.red, "✗ Nome do servidor é obrigatório"));
    console.error(`  Uso: mc mcp add <nome> [--type local|remote] [--cmd <cmd>] [--url <url>]`);
    process.exit(1);
  }

  const type = flags.type || "local";
  const body = { 
    name, 
    type, 
    enabled: true,
    description: flags.desc || "",
  };

  if (type === "local") {
    if (flags.cmd) {
      body.command = flags.cmd.split(" ");
    } else {
      // Presets conhecidos
      const PRESETS = {
        filesystem: { command: ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."] },
        git: { command: ["npx", "-y", "@modelcontextprotocol/server-git"] },
        fetch: { command: ["npx", "-y", "@modelcontextprotocol/server-fetch"] },
        "sequential-thinking": { command: ["npx", "-y", "@modelcontextprotocol/server-sequentialthinking"] },
        memory: { command: ["npx", "-y", "@modelcontextprotocol/server-memory"] },
      };
      
      if (PRESETS[name]) {
        Object.assign(body, PRESETS[name]);
        console.log(`  ${paint(C.gray, `Usando preset para '${name}'`)}`);
      } else {
        console.error(paint(C.red, `✗ Servidor '${name}' requer --cmd ou use um preset: ${Object.keys(PRESETS).join(", ")}`));
        process.exit(1);
      }
    }
  } else if (type === "remote") {
    if (!flags.url) {
      console.error(paint(C.red, "✗ Servidor remoto requer --url <url>"));
      process.exit(1);
    }
    body.url = flags.url;
  }

  try {
    await api("/mcp/servers", { method: "POST", body: JSON.stringify(body) });
    console.log(`  ${paint(C.lime, "✓")} Servidor MCP '${paint(C.white, name)}' adicionado`);
    console.log(`    ${paint(C.gray, "Tipo:")} ${type}`);
    if (body.command) console.log(`    ${paint(C.gray, "Comando:")} ${body.command.join(" ")}`);
    if (body.url) console.log(`    ${paint(C.gray, "URL:")} ${body.url}`);
  } catch (e) {
    console.error(paint(C.red, `✗ ${e.message}`));
    process.exit(1);
  }
}

async function cmdRemove(args) {
  const [name] = args;
  
  if (!name) {
    console.error(paint(C.red, "✗ Nome do servidor é obrigatório"));
    console.error(`  Uso: mc mcp remove <nome>`);
    process.exit(1);
  }

  try {
    await api(`/mcp/servers/${name}`, { method: "DELETE" });
    console.log(`  ${paint(C.lime, "✓")} Servidor MCP '${paint(C.white, name)}' removido`);
  } catch (e) {
    console.error(paint(C.red, `✗ ${e.message}`));
    process.exit(1);
  }
}

async function cmdToggle(args, enabled) {
  const [name] = args;
  
  if (!name) {
    console.error(paint(C.red, `✗ Nome do servidor é obrigatório`));
    console.error(`  Uso: mc mcp ${enabled ? "enable" : "disable"} <nome>`);
    process.exit(1);
  }

  try {
    await api(`/mcp/servers/${name}/toggle`, { 
      method: "POST", 
      body: JSON.stringify({ enabled }) 
    });
    console.log(`  ${paint(C.lime, "✓")} Servidor MCP '${paint(C.white, name)}' ${enabled ? "habilitado" : "desabilitado"}`);
  } catch (e) {
    console.error(paint(C.red, `✗ ${e.message}`));
    process.exit(1);
  }
}

async function cmdTools(args) {
  const [serverName] = args;
  
  try {
    const tools = await api(serverName ? `/mcp/servers/${serverName}/tools` : "/mcp/tools");
    
    section(serverName ? `FERRAMENTAS: ${serverName}` : "FERRAMENTAS MCP");
    
    if (tools.length === 0) {
      console.log(`  ${paint(C.gray, "— nenhuma ferramenta encontrada —")}`);
      return;
    }

    for (const tool of tools) {
      console.log(`  ${paint(C.lime, "•")} ${paint(C.white, tool.name)}`);
      console.log(`    ${paint(C.gray, tool.description || "Sem descrição")}`);
      if (tool.parameters) {
        console.log(`    ${paint(C.gray, "Parâmetros:")} ${JSON.stringify(tool.parameters)}`);
      }
      console.log();
    }
  } catch (e) {
    console.error(paint(C.red, `✗ ${e.message}`));
    process.exit(1);
  }
}

async function cmdInvoke(args) {
  const [serverName, toolName, jsonArgs] = args;
  
  if (!serverName || !toolName) {
    console.error(paint(C.red, "✗ Servidor e ferramenta são obrigatórios"));
    console.error(`  Uso: mc mcp invoke <servidor> <ferramenta> [args-json]`);
    console.error(`  Ex: mc mcp invoke filesystem read_file '{"path":"./README.md"}'`);
    process.exit(1);
  }

  let invokeArgs = {};
  if (jsonArgs) {
    try {
      invokeArgs = JSON.parse(jsonArgs);
    } catch {
      console.error(paint(C.red, "✗ Argumentos devem ser JSON válido"));
      process.exit(1);
    }
  }

  console.log(`  ${paint(C.gray, "Invocando...")} ${paint(C.white, `${serverName}.${toolName}`)}`);
  console.log(`  ${paint(C.gray, "Args:")} ${JSON.stringify(invokeArgs)}\n`);

  try {
    const result = await api("/mcp/invoke", {
      method: "POST",
      body: JSON.stringify({ server: serverName, tool: toolName, arguments: invokeArgs }),
    });
    
    console.log(paint(C.lime, "✓ Resultado:"));
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(paint(C.red, `✗ ${e.message}`));
    process.exit(1);
  }
}
