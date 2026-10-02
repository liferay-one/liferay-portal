# Simplified Technical English

Write in ASD-STE100, Simplified Technical English. It is a controlled language: a restricted vocabulary and a set of writing rules, built so that a reader who does not speak English as a first language reads a sentence once and takes one meaning from it.

This applies to everything written in this workspace for a person to read: commit messages, pull request descriptions, the files under `.agents/`, language keys, and any other user facing text. It does not apply to identifiers in code, which follow the naming rules, or to quoted output.

The repository has its own prose rules in `pr-reviewer/rules`, numbered 701 through 708. Those rules win where the two meet, and this file cites them in brackets. They settle four points that Simplified Technical English leaves open:

- Do not hyphenate. Close up a prefix and separate a compound: write `multiarg` and `long running`, not `multi-arg` and `long-running` [701].
- A short label is APA title case. Text that is a description is a complete sentence that ends in a period [702].
- A log or exception message is a phrase, a title, or two or more sentences, never a lone sentence with a period [703].
- In Markdown, put each paragraph on one line and let the editor wrap it [708].

Rules 704 through 707 say the same thing this file says: spell out contractions, keep the articles, write ID in uppercase, and use complete sentences.

## The Rules That Matter Most Here

**One word, one meaning.** A word keeps a single meaning throughout. "Close the modal" and "the close of the quarter" are two meanings of *close*; pick one and use another word for the other. The same goes in reverse: do not call the same thing a *screen*, a *page*, and a *view* in one document.

**One part of speech per word.** A word used as a verb is not also used as a noun. Write "the build failed", not "run a build and then build the client extension".

**Active voice.** "The rule reports 42 violations", not "42 violations are reported by the rule". The actor comes first and the sentence says who did the thing.

**Simple tenses.** Present, past, and future only. Not "the count has been reduced" — "the count is now 42" or "this change removed 8 of them".

**Short sentences.** Twenty words for an instruction, twenty five for a description. One idea per sentence. A sentence that needs a semicolon is usually two sentences.

**Keep the articles.** "Run the formatter", not "run formatter". Dropping *the* and *a* is the single most common way technical writing becomes ambiguous.

**No noun clusters over three words.** "The custom element structure rule ledger count" is five nouns deep and means nothing on first read. Break it with prepositions: "the open count for the structure rule".

**Start an instruction with the verb.** "Run `yarn lint` before you commit." Not "you should probably run lint first".

**No idiom, no metaphor, no figures of speech.** Not "papering over", "a time bomb", "load bearing", "hand rolled", "silently clobber". Say what happens: "the cast hides the error", "the request grows until it times out", "the code depends on it", "the code repeats what the library does", "the write replaces the file with no warning".

**One instruction per sentence.** Not "move the file and update its imports and run the linter again". Three sentences, or a list.

## What This Rules Out

These habits are common in this repository and each one breaks a rule above:

| Instead of | Write |
| --- | --- |
| "It turns out the file was dead" | "Nothing imports the file" |
| "This quietly breaks on a second run" | "The second run writes a duplicate record" |
| "A handful of sites" | "Six call sites" |
| "We should probably split this" | "Split this file" |
| "The rule was right for a reason I had not considered" | "The rule is correct. The folder holds no component." |
| "Clearing that file clears most of the count" | "That file holds 38 of the 42 violations" |

Vague quantities are the most frequent failure: *several*, *a few*, *most*, *a bunch*, *some*. Count the thing and write the number.

## Safety and Warnings

A warning comes before the step it applies to, never after. State the consequence first, then the condition.

> Data loss. The command deletes the volume. Stop the container before you run it.

## What This Does Not Mean

Simplified Technical English is not baby talk, and it does not forbid precision. A technical name stays a technical name — write *OAuth2 application*, *external reference code*, *client extension*. Keep the exact term and repeat it. Repetition is correct in STE; synonyms are the error.