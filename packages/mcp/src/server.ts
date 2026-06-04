import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readConfig } from './config.js';
import { ApiClient } from './apiClient.js';
import { searchTokensHandler, getQuoteHandler, buildSwapHandler, getPortfolioHandler, type ToolDeps } from './tools/handlers.js';
import { searchTokensSchema, quoteSchema, portfolioSchema, READ_ONLY, PREPARE } from './tools/definitions.js';

export function createServer(): McpServer {
  const config = readConfig();
  const deps: ToolDeps = { client: new ApiClient(config) };
  const server = new McpServer({ name: 'vortr', version: '0.1.6' });

  server.registerTool('search_tokens',
    { description: 'Search Vortr Base token registry by symbol, name, or address.', inputSchema: searchTokensSchema, annotations: READ_ONLY },
    (args) => searchTokensHandler(args, deps));

  server.registerTool('get_quote',
    { description: 'Get a 0x swap quote on Base (price, minBuyAmount, route, price impact). amount is base-units.', inputSchema: quoteSchema, annotations: READ_ONLY },
    (args) => getQuoteHandler(args, deps));

  server.registerTool('build_swap',
    { description: 'Build an ERC-5792 send_calls payload (approve+swap) for a Base swap. This tool never signs — sign payload.calls in your own wallet, or run the @vortr/wallet local signer for autonomous execution.', inputSchema: quoteSchema, annotations: PREPARE },
    (args) => buildSwapHandler(args, deps));

  server.registerTool('get_portfolio',
    { description: 'Get token balances for an address on Base.', inputSchema: portfolioSchema, annotations: READ_ONLY },
    (args) => getPortfolioHandler(args, deps));

  return server;
}
