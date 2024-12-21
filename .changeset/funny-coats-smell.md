---
'@3loop/transaction-decoder': patch
---

Fix crash in experimental erc20 resolver when address is empty. We provide an empty address when we decode logs for errors
