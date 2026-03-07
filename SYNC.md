# SYNC — Arquitetura de Sincronização
> Como os dois repositórios se mantêm em sincronia.
> Leia antes de qualquer operação de sync.

---

## TL;DR

```
argenta_fenix (workspace)          argenta-holistic-control (standalone)
sandbox/holistic-mission-control/  ←→  github.com/.../argenta-holistic-control
         ↑                                         ↑
  git add + commit + push              npm run sync:hmc
  (workflow de workspace)              (workflow de feature)
```

Dois repositórios, dois flows. Sincronize os dois quando fizer entregas de sprint.

---

## Por que dois repositórios?

| Repositório | Papel | Quando usar |
|---|---|---|
| `argenta_fenix` | Workspace completo da Argenta Fênix — todos os sistemas, governança, memória, identidade | Trabalho no contexto completo da Argenta |
| `argenta-holistic-control` | Mission Control standalone — produto independente, sem deps da Argenta | Desenvolvimento focado no Mission Control + futuro fork agnóstico |

O `argenta-holistic-control` evoluirá para um produto independente (Sprint 9 — Fork Agnóstico).
Enquanto isso, os dois precisam espelhar as mesmas mudanças.

---

## Arquitetura Técnica

### Estado atual (Sprint 7+)

`sandbox/holistic-mission-control/` tem **dois rastreadores independentes**:

```
c:/Users/rabel/.openclaw/workspace/
└── sandbox/
    └── holistic-mission-control/
        ├── .git/       ← repo argenta-holistic-control (standalone)
        └── ...arquivos rastreados também por argenta_fenix (workspace)
```

- O workspace `argenta_fenix` rastreia os arquivos como arquivos normais
- O standalone `argenta-holistic-control` tem seu próprio histórico git
- Ambos precisam ser commitados separadamente

### Por que não git submodule?

Submodules adicionam complexidade ao workflow diário (clone recursivo,
update manual, etc). Com o projeto ainda em desenvolvimento intenso,
o overhead não compensa. Revisaremos em Sprint 9 (Fork Agnóstico)
quando os repos divergirem intencionalmente.

---

## Flows de Sync

### Flow 1: Sync para argenta-holistic-control

Quando usar: após qualquer entrega de sub-sprint, antes de aprovações,
ou sempre que quiser que o repo standalone reflita o estado atual.

```bash
# Opção A: script automático (recomendado)
npm run sync:hmc
# ou com mensagem customizada:
bash sync-hmc.sh "docs: Sprint 7.3 — documentation layer"

# Opção B: manual
cd sandbox/holistic-mission-control
git add -A
git commit -m "chore: sync — 2026-03-07"
git push origin master
```

### Flow 2: Sync para argenta_fenix (workspace)

Quando usar: ao final de uma sessão de trabalho, quando quiser
preservar o histórico no workspace completo da Argenta.

```bash
# A partir da raiz do workspace (c:/Users/rabel/.openclaw/workspace/)
git add sandbox/holistic-mission-control/
git commit -m "chore: sync holistic-mission-control — $(date +%Y-%m-%d)"
git push
```

### Flow completo (ambos os repos)

```bash
# 1. Sync standalone
npm run sync:hmc

# 2. Sync workspace (execute de c:/Users/rabel/.openclaw/workspace/)
git add sandbox/holistic-mission-control/
git commit -m "chore: sync holistic-mission-control"
git push
```

---

## GitHub Actions

O arquivo `.github/workflows/scribe-notify.yml` está configurado no
standalone repo. Atualmente gera um summary automático de cada push.

### Ativar sync automático workspace ← standalone

Para que cada push no `argenta-holistic-control` sincronize automaticamente
de volta para o `argenta_fenix`:

1. Criar Personal Access Token:
   - GitHub → Settings → Developer settings → Personal access tokens
   - Escopo necessário: `repo` (acesso completo a repos privados)

2. Adicionar como secret no `argenta-holistic-control`:
   - Repo → Settings → Secrets and variables → Actions
   - Nome: `ARGENTA_SYNC_TOKEN`
   - Valor: o token criado no passo 1

3. Descomentar o job `sync-workspace` em `.github/workflows/scribe-notify.yml`

---

## Roadmap de Sync

| Sprint | Mudança |
|---|---|
| Sprint 7 (atual) | Dois flows manuais + Actions notify |
| Sprint 8 | Avaliar ativação do sync automático via token |
| Sprint 9 | **Ponto de divergência intencional** — repos param de espelhar |

### Sprint 9 — Fork Agnóstico

Quando chegar o Sprint 9, os repos divergirão intencionalmente:
- `argenta-holistic-control` remove referências à Argenta Fênix
- A sincronização bidirecional cessa
- `argenta_fenix` continua referenciando a versão "Argenta-specific"
- `argenta-holistic-control` evolui como produto genérico

Esse momento será documentado explicitamente no CHANGELOG.md
com a entrada `[Sprint 9.4] — Fork Point`.

---

## Referência rápida

```bash
# Ver status do standalone
cd sandbox/holistic-mission-control && git status

# Ver log do standalone
cd sandbox/holistic-mission-control && git log --oneline -5

# Ver status do workspace
cd workspace && git status sandbox/holistic-mission-control/

# Sync rápido standalone
npm run sync:hmc

# Sync rápido workspace (de workspace/)
git add sandbox/holistic-mission-control/ && git commit -m "chore: sync hmc" && git push
```
