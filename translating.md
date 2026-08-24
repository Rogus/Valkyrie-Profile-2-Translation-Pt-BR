# Translating

## What you edit

Everything is in `translate/`:

```
dialogue/scene-NNNN.csv       cutscenes, NPC dialogue, area lines
dialogue/container-0010.csv   the boot and title messages
menu/menu-1.csv .. menu-5.csv menus, items, descriptions, skills
chapters.csv                  the six chapter titles
```

**Fill in the `translated` column. Change nothing else** — every other column
is regenerated.

Open as UTF-8 and save as UTF-8, or the accents are destroyed.

## Why the workspace is shaped the way it is

**A scene keeps its own lines.** Every scene that draws a line has a row for
it, so a cutscene is translated in one file, start to finish, in order —
15 613 lines of dialogue across 406 files. The same sentence in another scene
has its own row there.

That does not mean typing it twice. A row arrives **pre-filled** with whatever
the same source line was given anywhere else, so a duplicate usually only has
to be read. Change it when the scene wants something different.

**The menu half is deduped**: 3 904 lines, each covering every record with the
same text. A label sized to its slot is the same label wherever it appears.

## The columns

| column                   | what it is                                                 |
| ------------------------ | ---------------------------------------------------------- |
| `speaker`                | who says it, read out of the game's own script             |
| `original_jp`            | the Japanese, as the JP disc draws it                      |
| `original_en`            | the English, as the USA disc draws it                      |
| `translated`             | **here**                                                   |
| `scene`, `scene_line`    | reading order — translate in this order                    |
| `resource`, `message_id` | which record it patches                                    |
| `also_shown_in`          | other scenes that draw the same line; each has its own row |
| `occurrences` (menus)    | how many records this one line covers                      |
| `notes`                  | anything the export knew                                   |

`original_jp` is worth reading. The English release sometimes softens or
compresses a line, and the Japanese shows what was meant.

## Rules that matter

**Keep every `<XXXX>` marker exactly as it is.** They are control codes —
colour, position, timing. `<8099:52>` carries a parameter inside the tag;
copy it whole.

**`<PART>` is a page break** — the player presses X. Keep it where it is. A
run of `---` on its own line is the same thing written differently; leave it
alone rather than turning it into hyphens.

**A leading `_ <PART>` in an area-banner source is an opaque control, not a
visible text part.** Do not copy that first placeholder into `translated`;
start with the first visible name. For example, resource 57's source is
`_ <PART> Dipan <PART> Dipan Castle Gates`, while its translation is
`Dipan <PART> Portões do Castelo de Dipan`. The writer preserves the original
control token around those two visible runs. The same rule applies when the
runs use different faces: resource 33's `Solde <PART> Rua das Almas` keeps
`Solde` on the shared code page and writes the street name with the local font
automatically.

**`<PART>` also separates visible runs inside fontless system messages.**
Keep the same number and order of parts. The writer replaces each visible run
through the shared font while preserving input icons, timing and page controls
from the source record. Horizontal spacing around an inline icon or colour
change, and structural blank-line padding between paragraphs, are inherited
from the source runs; translators do not need to encode special padding around
`<PART>`. The one exception is the `0x8099` input icon: the patcher always
forces a space on each side of it, even when the source's English edges left the
icon touching text (resource 185's square-button-then-period case). You can
still type a leading or trailing space in the CSV at will, but the rendered
output will be the same whether you do or do not. A record containing only a
control owns no letters and is kept byte-identical; its displayed wording is
assembled by another text record at runtime.

**Menus and dialogue never mix.** A translation written in `menu/` only ever
reaches menu records, and one written in `dialogue/` only reaches dialogue.
`Yes` is a button in one and a character answering in the other.

**An empty cell ships English**, and is never filled from another scene
behind your back. The blank is the signal.

That is what makes the per-scene rows worth their bulk. Portuguese genders
nouns, so `Adventurer` is _Aventureiro_ over one NPC and _Aventureira_ over
another, and a single shared translation could only say one of them. The same
holds for anything whose wording depends on who is speaking or what is
happening around it.

## Accents

Every accent works in dialogue, menus and the world map:
`á â ã à ç é ê í ó ô õ ú` and their capitals. `à` and `ô` were the last two,
and they needed the shared font to grow.

Normal punctuation remains available too. In particular, write `;` directly;
its original codepage slot is protected from the accent installer.

If the build refuses a character, that is a real gap and worth reporting —
it means the glyph has no source, not that you typed it wrong.

## Reference

`glossary/` holds agreed names for characters, places, items and
skills. **The build never reads it.** It is there so the same character is
called the same thing everywhere; if a glossary entry and a line disagree, the
line wins.

## When you are done

The build reads `translate/` directly:

```bash
py -3 vp2_build.py <usa.iso>
```
