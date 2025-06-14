# NoGAL

## Overview

NoGAL is a script that takes a directory parameter of MAME files and, by default, purges the mature games from the collection.  An additional category `-c` switch can be used to manually specify the category.  The potential catalog of games to be purged are listed along with their category, in `catver.ini` from [progettosnaps.net](https://www.progettosnaps.net/catver/)


## Commands

```shell
nogal -h
```
```text
Usage: nogal [options]

NoGAL - MAME game purging tool

Options:
  -V, --version              output the version number
  -d, --directory <path>     directory containing MAME files
  -c, --category <category>  category to filter (default: mature games)
  -i, --case-insensitive     case insensitive category matching
  -l, --list                 list matching games instead of deleting them
  -b, --backup <path>        backup directory to move files instead of deleting
  -h, --help                 display help for command
```

## Examples

### Delete all games in the sports category (case insensitive) 

```shell
nogal -ci "sports" --directory /b/roms/mame
```

### Delete all mature games from the directory by moving them to a backup directory

```shell
nogal -d /b/roms/mame -b "~/backup"
```

### List all games in the mature category

```shell
nogal -lc "mature"
```

## Categories

```text
Arcade
Ball & Paddle
Bartop
Board Game
Calculator
Card Games
Casino
Climbing
Computer
Computer Graphic Workstation
Digital Camera
Digital Simulator
Driving
Electromechanical
Fighter
Gambling
Game Console
Handheld
Mature
Maze
Medal Game
Medical Equipment
Misc.
MultiGame
Multiplay
Music
Music Game
Platform
Player
Printer
Puzzle
Quiz
Radio
Redemption Game
Shooter
Simulation
Slot Machine
Sports
System
Tablet
Tabletop
Telephone
Touchscreen
TV Bundle
Utilities
Watch
Whac-A-Mole
```

## License

MIT

## Links

* [commander]()

