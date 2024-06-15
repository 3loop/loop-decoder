# Loop Interpreter

## Exploration

Initial implemnetation will load all the interpreters in one JavaScript bundle. This should not be a problem if used in a node environment. We are open to explore approches that will allow an universal approch to dynamically import interpreters.

The current implementation uses 2 tables to quickly find the interpertation for a given contract. The first table is a map of contract address to the index of the contract in the second table. The second table is a list of all interpreters. This allows us to quickly access all the interpreters and share the same interpreter for multiple contracts.
