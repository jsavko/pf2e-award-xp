# shadowdark-award-xp
 
Use a command to award Treasure XP to every player in the party!

### Installation

Use the Install Module dialog and paste the Manifest URL `https://github.com/zacharydwaller/shadowdark-award-xp/releases/download/latest/module.json`

### Setup

Create an Actor folder called "The Party" and drop your player characters into it. NPCs can also be placed in this folder, only Players will be awarded XP. Conversely, any characters not in The Party will not be awarded XP.

### Usage

Use the `/award` command like so:

```/award 1```

To award XP to each character in The Party.
 Optionally, add a description of the award like so:

```/award 10 Dragon's treasure hoard```

![Command](https://github.com/user-attachments/assets/0050b631-16a5-418c-9306-da8bd424633b)


Add journal enrichers to allow reward dialog inside journals! Enrichers will automatically change text in this format to a clickable link

```[[/award 10 Accomplishment (Minor)]]{Minor Accomplishment}```

![Journal](https://github.com/user-attachments/assets/5756ba32-ed8d-4f12-bc46-4d5a20a4c458)
