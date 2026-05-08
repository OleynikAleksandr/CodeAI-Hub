# Development Tree Orchestration Architecture

**Status:** active planning draft  
**Created:** 2026-05-08  
**Scope:** universal Development Tree workflow for applications generated through Product Part / Cluster / Module architecture.

## 1. Problem

After `Quality Gates Baseline`, the product workflow no longer behaves like a linear trunk stage. The Development Tree may contain many Product Parts, Clusters, and Modules. If Core automatically creates every session and every draft artifact at once, the workspace becomes noisy before the user can review anything:

- many unreviewed draft artifacts appear at the same time;
- many agents may try to commit in one Git workspace;
- the user is still a single reviewer, so large automatic fan-out does not create useful review parallelism;
- later code implementation needs a real dependency/wave plan, not ad hoc parallel execution.

The Development Tree must therefore be orchestrated in phases. Documentation and contract work may remain in the canonical workspace, but it must be user-started and node-scoped. Code implementation must wait for accepted contracts and a global implementation wave plan.

## 2. Principles

- The workflow is universal. It must work for any application produced through the Product Part / Cluster / Module model, not only CodeAI Hub.
- Product Part is primarily an orchestration and delivery boundary. Cluster and Module are the main work units for contracts and implementation.
- Core should not eagerly create all branch sessions after Quality Gates. It should create a navigable Development Tree index and wait for explicit user starts.
- User review capacity is the limiting factor during documentation. Parallel documentation sessions are allowed only because the user explicitly starts them.
- Code implementation is not user-chat-driven node by node. It is executed by Core from a validated implementation wave plan.
- Core should keep the canonical workspace clean: each node produces bounded commits, and implementation patches enter main only through acceptance/merge orchestration.

## 3. Phase 1: User-Driven Development Tree Documentation

After Quality Gates is accepted, Core creates only the Development Tree read model/index:

- Product Parts;
- Clusters under each Product Part;
- standalone Modules under each Product Part;
- Module nodes under each Cluster;
- node status records, initially `not_started`.

Core does not automatically create all sessions or all draft artifacts.

The user starts nodes from the UI:

- Product Part overview/spec session, if useful;
- Cluster specification/contract session;
- standalone Module specification/contract session;
- Module specification/contract session under a Cluster.

Default UX should encourage small batches:

- start one Product Part area, Cluster, or standalone Module;
- review and accept its artifacts;
- then continue to the next node.

The user may still start several nodes in parallel. Core must allow this only when Git is clean and the node scopes do not conflict. Each active node has its own node task record and expected commit flow.

Node documentation acceptance requires:

- agent-produced artifacts are committed through the managed node plan/command;
- Core validates the artifacts against the node contract;
- user accepts or requests correction;
- the node task record records acceptance.

No code implementation starts in this phase.

## 4. Phase 2: Contract-Based Implementation Planning

When the required Cluster/Module contracts are accepted, the user can request `Plan Implementation`.

Core starts an Implementation Planner workflow. The Planner must not read all prose documentation by default. Its input is the accepted contract set and structural indexes:

- Application Skeleton map;
- Quality Gates contract;
- Product Part summaries when present;
- Cluster contracts;
- Module facade contracts;
- Module implementation contract summaries;
- machine-readable dependency/provides/consumes fields.

The Planner produces:

- `implementation-plan.md` for user review;
- `implementation-plan.json` for Core execution.

The plan must include:

- all implementation nodes covered by the accepted contracts;
- dependency graph;
- implementation waves;
- parallel-safe groups;
- serial blockers;
- required stub/interface waves;
- shared-surface escalation points;
- expected test/build/check scope per wave.

Core validates the JSON before user acceptance:

- every accepted implementation node is scheduled or explicitly deferred;
- dependencies point to known contracts;
- wave order respects dependencies;
- parallel nodes do not overlap owned paths or shared surfaces;
- contract-impacting changes are scheduled before dependent implementation;
- cycles have an explicit strategy.

If required scheduling data is missing, Planner must report a contract gap rather than reading unrelated prose and guessing.

## 5. Phase 3: Deterministic Implementation Micro-Plans

After the global implementation plan is accepted, Core materializes deterministic implementation plans for the scheduled work units.

Each implementation node plan contains:

- node id and type (`cluster`, `module`, or integration node);
- base commit;
- owned code paths;
- read-only contract/context paths;
- forbidden/shared paths;
- expected proposal or commit message;
- microtasks with small file scope;
- local checks;
- acceptance criteria;
- declared shared-surface requests, if any.

Module implementation plans should be local by default. Cluster implementation plans own integration inside a cluster. Product Part or global implementation plans are reserved for cross-cluster, packaging, config, or release-level work.

These plans are not free-form chat notes. They are Core-executable contracts for implementation agents.

## 6. Phase 4: Orchestrated Code Execution

Core executes implementation waves without asking the user to manually conduct every node session.

For each wave:

1. Core creates isolated execution resources only for the current wave.
2. Core starts agents whose nodes are marked parallel-safe.
3. Agents produce bounded implementation proposals.
4. Core validates proposals against node plans, contracts, and Quality Gates.
5. Core merges accepted proposals into the canonical workspace in deterministic order.
6. Core records wave results and starts the next wave when all blockers are cleared.

Execution resources are created just in time, not for the whole Development Tree upfront.

Recommended isolation model:

- documentation/contract phase: canonical workspace, node-scoped commits;
- module implementation: module proposal sandbox or sparse cluster workspace;
- cluster integration: sparse cluster workspace;
- product/global integration: full or broader integration workspace;
- release/check waves: canonical or dedicated full integration workspace.

Core, not individual implementation agents, decides when accepted code enters main.

## 7. Parallelism Rules

Nodes can run in the same implementation wave only if:

- owned paths do not overlap;
- neither node changes the same shared surface;
- neither node depends on outputs from the other in the current wave;
- required public contracts/stubs already exist;
- their local checks can run independently or have a defined integration check;
- no node requires root package/config/tooling changes unless scheduled as a shared integration task.

If a module needs a shared change, it creates a shared-surface request instead of silently changing the shared file. Core routes that request to the owning Cluster/Product/global integration plan.

## 8. Core State Model

Development Tree orchestration should expose explicit states:

- `tree_index_ready`;
- `node_not_started`;
- `node_drafting`;
- `node_needs_user_review`;
- `node_accepted`;
- `implementation_planning_requested`;
- `implementation_plan_proposed`;
- `implementation_plan_validated`;
- `implementation_plan_accepted`;
- `wave_running`;
- `wave_merging`;
- `wave_accepted`;
- `implementation_complete`;
- `blocked`.

The UI should show which nodes are user-review work and which nodes are implementation execution work.

## 9. Open Decisions

- Exact storage path for Development Tree node task records.
- Whether Product Part overview/spec is mandatory or optional before Cluster/Module starts.
- Node-scoped command shape for documentation commits.
- Implementation proposal format: Git worktree branch, sparse worktree, patch sandbox, or hybrid.
- Minimal machine-readable contract schema required before Implementation Planner can run.
- How much user control is exposed for starting several documentation nodes in parallel.
