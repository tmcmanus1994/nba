# Pedal Party — Ride Sheet Setup (for Dom)

The website reads one Google Sheet to know what to show in the **Next Ride**
section. You edit the sheet — never any code. Here's the whole thing, start
to finish.

## One-time setup (10 steps)

1. Go to [sheets.google.com](https://sheets.google.com) and click **Blank spreadsheet**. Name it `Pedal Party Rides`.
2. In **row 1**, type these column headers, one per cell, exactly as written (lowercase, with underscores):

   | A | B | C | D | E | F | G | H | I | J | K |
   |---|---|---|---|---|---|---|---|---|---|---|
   | `ride_date` | `status` | `title` | `hype_line` | `location` | `gather_time` | `roll_time` | `plan` | `heads_up` | `image_url` | `note` |

3. That's the whole structure — one row per Monday ride (you'll add rows weekly, see below).
4. Now publish it so the website can read it: click **File → Share → Publish to web**.
5. In the dialog: first dropdown = **Sheet1**, second dropdown = **Comma-separated values (.csv)**.
6. Click **Publish**, then **OK** to confirm.
7. Copy the long link it gives you (it ends in `output=csv`).
8. Send that link to Travelle — it gets pasted once into the website (`SHEET_URL` at the top of `js/rideState.js`) and you never touch it again.
9. Important: this link makes the sheet's *contents* public (read-only). Don't put anything private in it.
10. Done. From now on you only ever add rows.

## Every Saturday (adding this week's ride)

Add one new row and fill in the columns:

| Column | What to type | Example |
|---|---|---|
| `ride_date` | The **Monday** of the ride, as `YYYY-MM-DD` | `2026-07-20` |
| `status` | `scheduled` — or `no_ride` / `weather_cancel` | `scheduled` |
| `title` | The theme | `Christmas in July` |
| `hype_line` | The fun flavor sentence from your IG caption | `Jingle bells on handlebars…` |
| `location` | The meetup spot | `Whole Hog BBQ` |
| `gather_time` | Almost always | `6:00 PM` |
| `roll_time` | Almost always | `6:30 PM` |
| `plan` | The stops, **one per line** (press `Alt+Enter` inside the cell for a new line) | `Gather at Whole Hog…` |
| `heads_up` | Optional warning (hills, lights, water) — leave blank if none | `~277 ft of climbing…` |
| `image_url` | Link to the week's 9:16 announcement image (see below) | `https://…` |
| `note` | Only used for `no_ride` / `weather_cancel` weeks — the explanation | `Taking Labor Day off!` |

The site flips to the full ride view **automatically at Saturday noon** — you
can add the row any time before that.

### Image link tip

Any public image link works in `image_url`. Easiest path: upload the 9:16
announcement image to Google Drive → right-click → **Share → Anyone with the
link** → copy link. (Travelle can set up a shared folder so this is two clicks.)

## Special weeks

- **Skipping a week?** Add the row with `ride_date` = that Monday, `status` = `no_ride`, and put the reason in `note`. Everything else can stay blank.
- **Rained out?** Change that week's `status` to `weather_cancel` (add a `note` if you like). The site updates within a page-refresh.
- **Off-season** (Nov 1 – Mar 31) is automatic — the site shows the hibernation countdown to April Fools' Day without you doing anything.

## If something looks wrong on the site

- Check the `ride_date` is the Monday and formatted `YYYY-MM-DD`.
- Check `status` is exactly `scheduled`, `no_ride`, or `weather_cancel` (no caps).
- The site never breaks: if it can't find this week's row it just shows the countdown.
