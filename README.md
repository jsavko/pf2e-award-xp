# shadowdark-award-xp
 
Use a command to award Treasure XP to every player in the party!

### Installation

Use the Install Module dialog and paste the Manifest URL: `https://github.com/zacharydwaller/shadowdark-award-xp/releases/download/latest/module.json`

This module has been submitted to Foundry for approval, once approved it can be installed normally using the Install Module dialog.

### Setup

Create an Actor folder called "The Party" and drop your player characters into it. Only characters that are in this folder will be awarded XP. NPCs can also be placed in the folder without issue.

### Usage

Use the `/award` command to award each character in The Party:

```/award 1```

Optionally, add a description of the award:

```/award 10 Dragon's treasure hoard```

![chatoutput](https://github.com/jsavko/shadowdark-award-xp/assets/192591/b19d5efd-d5e3-473f-b671-0fac904144d8)

Add journal enrichers to allow reward dialog inside journals! Enrichers will automatically change text in this format to a clickable link

```[[/award 10 Accomplishment (Minor)]]{Minor Accomplishment}```

![enricher(3)](https://github.com/jsavko/shadowdark-award-xp/assets/192591/f5405fb3-c9af-401a-8753-5e8cdeeb1871)
