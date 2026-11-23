# Run from the project folder:  python3 patch_models.py
import sys
p='AGENTS.md'
s=open(p,encoding='utf-8').read()
pairs=[
("(OPUS or SONNET)","(OPUS, SONNET, or FLASH with its effort low/med/high)"),
("([OPUS] or [SONNET])","([OPUS], [SONNET] or [FLASH:low|med|high]; [OWNER] tasks are done by the owner)"),
("<OPUS or SONNET>","<OPUS | SONNET | FLASH low/med/high>"),
]
for old,new in pairs:
    if old in s:
        s=s.replace(old,new); print("ok:",old)
    else: print("NOT FOUND (check by hand):",old)
block='''## Extra rules when the active model is FLASH
- Do only the current task. Do not edit src/algorithms/, tests/algorithms/, DESIGN.md or tokens.css. If a token is missing, stop and ask the owner.
- Before every commit run these two checks and fix every hit that is not a media query or a 1px border:
  grep -rnE '#[0-9A-Fa-f]{3,8}\\b' src/pages src/layouts src/components
  grep -rnE '[0-9]+px' src/pages src/layouts src/components
- If npm test or npm run build still fails after 2 fix attempts, stop. Write the error under KNOWN ISSUES / BLOCKERS in progress.txt. Do not keep trying.
- If the task needs algorithm changes, or you are unsure, stop and tell the owner to switch to SONNET.

'''
if '## Extra rules when the active model is FLASH' not in s:
    if '## Hard rules' in s:
        s=s.replace('## Hard rules',block+'## Hard rules',1); print("ok: FLASH block added")
    else: print("NOT FOUND: ## Hard rules")
open(p,'w',encoding='utf-8').write(s)
