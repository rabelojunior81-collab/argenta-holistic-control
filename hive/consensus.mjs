#!/usr/bin/env node
/**
 * 🗳️ Distributed Consensus Module — Votação entre Agentes
 * 
 * Sistema de propostas e votação para decisões distribuídas.
 * Suporta: maioria simples, maioria qualificada, consenso total.
 */

import { readFile, writeFile, appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dir);

const HIVE_PATH = join(ROOT, "hive", "agents.json");
const CONSENSUS_PATH = join(ROOT, "hive", "consensus.json");
const EVENTS_PATH = join(ROOT, "ops", "events.jsonl");

// ─── Tipos de Quorum ─────────────────────────────────────────────────────────

const QUORUM_TYPES = {
  SIMPLE: "simple",           // > 50%
  SUPERMAJORITY: "super",     // > 66%
  CONSENSUS: "consensus",     // 100%
  WEIGHTED: "weighted"        // Baseado em reputação
};

// ─── Proposals ───────────────────────────────────────────────────────────────

/**
 * Cria uma nova proposta para votação
 * @param {string} proposerId - ID do agente proponente
 * @param {string} title - Título da proposta
 * @param {string} description - Descrição detalhada
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Object>} Proposta criada
 */
export async function createProposal(proposerId, title, description, options = {}) {
  const hive = JSON.parse(await readFile(HIVE_PATH, "utf8"));
  
  // Verificar se proponente existe e está ativo
  const proposer = hive.agents.find(a => a.id === proposerId && a.status !== "done" && a.status !== "zombie");
  if (!proposer) {
    throw new Error(`Agente proponente '${proposerId}' não encontrado ou inativo`);
  }
  
  // Carregar ou criar consensus store
  let consensus = { proposals: [], votes: [] };
  try {
    consensus = JSON.parse(await readFile(CONSENSUS_PATH, "utf8"));
  } catch {}
  
  const proposal = {
    id: `prop-${randomUUID().slice(0, 8)}`,
    title,
    description,
    proposer: proposerId,
    proposer_name: proposer.name,
    quorum_type: options.quorum || QUORUM_TYPES.SIMPLE,
    eligible_voters: options.eligible || null, // null = todos
    min_votes: options.minVotes || null,
    deadline: options.deadline || null,
    status: "open", // open, passed, rejected, expired
    created: new Date().toISOString(),
    closed: null,
    result: null
  };
  
  consensus.proposals.push(proposal);
  await saveConsensus(consensus);
  
  await logEvent({
    event: "proposal_created",
    proposal_id: proposal.id,
    proposer: proposerId,
    title: title.slice(0, 50)
  });
  
  return proposal;
}

/**
 * Registra um voto em uma proposta
 * @param {string} proposalId 
 * @param {string} voterId 
 * @param {string} vote - "yes", "no", "abstain"
 * @param {string} reason - Justificativa opcional
 * @returns {Promise<Object>} Resultado atualizado
 */
export async function castVote(proposalId, voterId, vote, reason = "") {
  if (!["yes", "no", "abstain"].includes(vote)) {
    throw new Error("Voto deve ser: yes, no, ou abstain");
  }
  
  const consensus = await loadConsensus();
  const proposal = consensus.proposals.find(p => p.id === proposalId);
  
  if (!proposal) throw new Error(`Proposta '${proposalId}' não encontrada`);
  if (proposal.status !== "open") throw new Error(`Proposta já está ${proposal.status}`);
  
  // Verificar deadline
  if (proposal.deadline && new Date() > new Date(proposal.deadline)) {
    proposal.status = "expired";
    await saveConsensus(consensus);
    throw new Error("Proposta expirou");
  }
  
  // Verificar elegibilidade
  const hive = JSON.parse(await readFile(HIVE_PATH, "utf8"));
  const voter = hive.agents.find(a => a.id === voterId);
  if (!voter) throw new Error(`Votante '${voterId}' não encontrado`);
  
  if (proposal.eligible_voters && !proposal.eligible_voters.includes(voterId)) {
    throw new Error("Votante não elegível para esta proposta");
  }
  
  // Remover voto anterior se existir
  consensus.votes = consensus.votes.filter(v => !(v.proposal === proposalId && v.voter === voterId));
  
  // Registrar novo voto
  consensus.votes.push({
    id: `vote-${randomUUID().slice(0, 8)}`,
    proposal: proposalId,
    voter: voterId,
    voter_name: voter.name,
    vote,
    reason: reason.slice(0, 200),
    ts: new Date().toISOString()
  });
  
  await saveConsensus(consensus);
  
  await logEvent({
    event: "vote_cast",
    proposal_id: proposalId,
    voter: voterId,
    vote
  });
  
  // Verificar se atingiu quorum
  const result = await checkQuorum(proposalId);
  return result;
}

/**
 * Verifica se uma proposta atingiu quorum
 * @param {string} proposalId 
 * @returns {Promise<Object>} Status atual
 */
export async function checkQuorum(proposalId) {
  const consensus = await loadConsensus();
  const proposal = consensus.proposals.find(p => p.id === proposalId);
  
  if (!proposal) throw new Error("Proposta não encontrada");
  
  const votes = consensus.votes.filter(v => v.proposal === proposalId);
  const eligible = await getEligibleVoters(proposal);
  
  const yesVotes = votes.filter(v => v.vote === "yes").length;
  const noVotes = votes.filter(v => v.vote === "no").length;
  const abstainVotes = votes.filter(v => v.vote === "abstain").length;
  const totalVotes = yesVotes + noVotes + abstainVotes;
  const participating = yesVotes + noVotes; // abstain não conta para quorum
  
  let passed = false;
  let reason = "";
  
  switch (proposal.quorum_type) {
    case QUORUM_TYPES.SIMPLE:
      passed = participating > 0 && (yesVotes / participating) > 0.5;
      reason = passed ? "Maioria simples atingida" : `Aguardando maioria (${yesVotes}/${participating})`;
      break;
      
    case QUORUM_TYPES.SUPERMAJORITY:
      passed = participating > 0 && (yesVotes / participating) > 0.66;
      reason = passed ? "Supermaioria atingida" : `Aguardando 2/3 (${yesVotes}/${participating})`;
      break;
      
    case QUORUM_TYPES.CONSENSUS:
      passed = participating === eligible.length && noVotes === 0;
      reason = passed ? "Consenso total" : `Aguardando todos (${participating}/${eligible.length}, ${noVotes} não)`;
      break;
      
    case QUORUM_TYPES.WEIGHTED:
      // Implementação simplificada - poderia usar reputação
      passed = participating > 0 && (yesVotes / participating) > 0.5;
      reason = "Maioria ponderada";
      break;
  }
  
  // Verificar min_votes
  if (proposal.min_votes && totalVotes < proposal.min_votes) {
    passed = false;
    reason = `Mínimo de votos não atingido (${totalVotes}/${proposal.min_votes})`;
  }
  
  // Fechar proposta se passou
  if (passed && proposal.status === "open") {
    proposal.status = "passed";
    proposal.closed = new Date().toISOString();
    proposal.result = { yes: yesVotes, no: noVotes, abstain: abstainVotes };
    await saveConsensus(consensus);
    
    await logEvent({
      event: "proposal_passed",
      proposal_id: proposalId,
      votes: { yes: yesVotes, no: noVotes, abstain: abstainVotes }
    });
  }
  
  return {
    proposal_id: proposalId,
    status: proposal.status,
    total_votes: totalVotes,
    eligible_voters: eligible.length,
    yes: yesVotes,
    no: noVotes,
    abstain: abstainVotes,
    passed,
    reason
  };
}

/**
 * Fecha uma proposta manualmente
 * @param {string} proposalId 
 * @returns {Promise<Object>} Resultado final
 */
export async function closeProposal(proposalId) {
  const consensus = await loadConsensus();
  const proposal = consensus.proposals.find(p => p.id === proposalId);
  
  if (!proposal) throw new Error("Proposta não encontrada");
  if (proposal.status !== "open") throw new Error(`Proposta já está ${proposal.status}`);
  
  const result = await checkQuorum(proposalId);
  
  if (!result.passed) {
    proposal.status = "rejected";
    proposal.closed = new Date().toISOString();
    proposal.result = { yes: result.yes, no: result.no, abstain: result.abstain };
    await saveConsensus(consensus);
    
    await logEvent({
      event: "proposal_rejected",
      proposal_id: proposalId,
      votes: proposal.result
    });
  }
  
  return result;
}

/**
 * Lista todas as propostas
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise<Array>} Propostas
 */
export async function listProposals(filters = {}) {
  const consensus = await loadConsensus();
  let proposals = consensus.proposals;
  
  if (filters.status) {
    proposals = proposals.filter(p => p.status === filters.status);
  }
  
  if (filters.proposer) {
    proposals = proposals.filter(p => p.proposer === filters.proposer);
  }
  
  return proposals.map(p => ({
    ...p,
    vote_count: consensus.votes.filter(v => v.proposal === p.id).length
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadConsensus() {
  try {
    return JSON.parse(await readFile(CONSENSUS_PATH, "utf8"));
  } catch {
    return { proposals: [], votes: [] };
  }
}

async function saveConsensus(consensus) {
  consensus.updated = new Date().toISOString();
  await writeFile(CONSENSUS_PATH, JSON.stringify(consensus, null, 2), "utf8");
}

async function getEligibleVoters(proposal) {
  const hive = JSON.parse(await readFile(HIVE_PATH, "utf8"));
  
  if (proposal.eligible_voters) {
    return proposal.eligible_voters.map(id => {
      const agent = hive.agents.find(a => a.id === id);
      return agent || { id, name: "Unknown" };
    });
  }
  
  // Todos os agentes ativos
  return hive.agents.filter(a => a.status !== "done" && a.status !== "zombie");
}

async function logEvent(event) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n";
  await appendFile(EVENTS_PATH, line, "utf8");
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  
  try {
    switch (cmd) {
      case "propose": {
        const [proposerId, ...titleParts] = process.argv.slice(3);
        const title = titleParts.join(" ");
        if (!proposerId || !title) {
          console.error("Uso: node consensus.mjs propose <proposer-id> <título>");
          process.exit(1);
        }
        const proposal = await createProposal(proposerId, title, "Proposta via CLI", { quorum: "simple" });
        console.log(`✓ Proposta criada: ${proposal.id}`);
        console.log(`  Título: ${proposal.title}`);
        break;
      }
      
      case "vote": {
        const [proposalId, voterId, vote, ...reasonParts] = process.argv.slice(3);
        const reason = reasonParts.join(" ");
        if (!proposalId || !voterId || !vote) {
          console.error("Uso: node consensus.mjs vote <proposal-id> <voter-id> <yes|no|abstain> [razão]");
          process.exit(1);
        }
        const result = await castVote(proposalId, voterId, vote, reason);
        console.log(`✓ Voto registrado: ${vote}`);
        console.log(`  Status: ${result.passed ? "✅ PASSOU" : "⏳ EM ANDAMENTO"}`);
        console.log(`  Votos: ${result.yes} sim, ${result.no} não, ${result.abstain} abstêmios`);
        break;
      }
      
      case "list": {
        const proposals = await listProposals();
        console.log("\n📋 Propostas de Consenso\n");
        proposals.forEach(p => {
          const status = p.status === "passed" ? "✅" : p.status === "rejected" ? "❌" : p.status === "open" ? "🟡" : "⚪";
          console.log(`  ${status} ${p.id} — ${p.title.slice(0, 50)} (${p.vote_count} votos)`);
        });
        break;
      }
      
      case "close": {
        const proposalId = process.argv[3];
        if (!proposalId) {
          console.error("Uso: node consensus.mjs close <proposal-id>");
          process.exit(1);
        }
        const result = await closeProposal(proposalId);
        console.log(`✓ Proposta fechada`);
        console.log(`  Resultado: ${result.passed ? "✅ APROVADA" : "❌ REJEITADA"}`);
        break;
      }
      
      default:
        console.log(`
🗳️ Distributed Consensus Module

Uso: node consensus.mjs <comando>

Comandos:
  propose <proposer-id> <título>        Cria nova proposta
  vote <prop-id> <voter-id> <voto>      Vota (yes/no/abstain)
  list                               Lista propostas
  close <prop-id>                    Fecha proposta

Exemplos:
  node consensus.mjs propose agt-code-native "Implementar feature X"
  node consensus.mjs vote prop-xxx agt-plan-native yes "Concordo!"
  node consensus.mjs list
`);
    }
  } catch (err) {
    console.error(`✗ Erro: ${err.message}`);
    process.exit(1);
  }
}

export { QUORUM_TYPES };
