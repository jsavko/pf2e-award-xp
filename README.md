# shadowdark-award-xp
 
Use a command to award Treasure XP to every player in the party!

### Setup

Create an Actor folder called "The Party" and drop your player characters into it. NPCs can also be placed in this folder, only Players will be awarded XP. Conversely, any characters not in The Party will not be awarded XP.

### Usage

Use the `/award` command like so:

```/award 1```

To award XP to each character in The Party.
 Optionally, add a description of the award like so:

```/award 10 Dragon's treasure hoard```

![chatoutput](https://github.com/jsavko/shadowdark-award-xp/assets/192591/b19d5efd-d5e3-473f-b671-0fac904144d8)

Add journal enrichers to allow reward dialog inside journals! Enrichers will automatically change text in this format to a clickable link

```[[/award 10 Accomplishment (Minor)]]{Minor Accomplishment}```

![enricher(3)](https://github.com/jsavko/shadowdark-award-xp/assets/192591/f5405fb3-c9af-401a-8753-5e8cdeeb1871)
