# Scoring and leaderboard

## Score formula

Each solved round produces a detailed score breakdown:

```text
base score
+ accuracy bonus
+ time bonus
+ prompt quality bonus
+ Adventure mode bonus
+ difficulty multiplier bonus
+ streak bonus
- extra attempt penalty
```

## Difficulty rules

```text
Easy   -> lower multiplier, slower time window, lighter attempt penalty
Normal -> balanced default
Hard   -> higher multiplier, shorter time window, stronger attempt penalty
```

## Grades

```text
S -> elite result
A -> excellent result
B -> strong result
C -> solved but improvable
D -> low-scoring solve
```

## Leaderboard sorting

Entries are ranked deterministically:

```text
1. highest score first
2. fewer attempts when scores are tied
3. shorter elapsed time when still tied
4. oldest solved entry when still tied
```

## Local storage

The local prototype writes leaderboard entries to:

```text
server/data/leaderboard.local.json
```

For the hosted Civitai version, this file-based store should be replaced with a persistent backend store.
