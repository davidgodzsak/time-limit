# Implememtation Todo

## Bugs

### Timeout page
-[x] Randomize with default suggestions not working
-[x] Randomize button makes the dots that show different quotes disappear. Also Randomize button should be a bit bigger and be below the dots, not inline.
-[x] Hard to click the dots to select a new message
-[x] Both the Big message and the carousel of messages does not really make sense
-[x] When randomizing or changing the displayed message, and the new text has a different number of lines than the previous then the rest of the page "jumps". Let's allocate 4-5 lines for the text and have the dots, the random button and all content below that fixed so even if the number of lines change, it does not move around.

### Settings page
- [x] Editing individual site does not work, when clicking on the edit icon nothing happens it should show the same dialog as the create, but prefilled
- [x] Limit tab -> Add site button should be inside individual sites title line, not next to the searchbar
- [x] Limit tab -> searchbar not working it should filter both individual sites and groups (expand the group if it contains a match)
- [x] Groups tab -> Edit group when removing open or time limit and then clicking update group button, it does not store the changes (it should be required to add either time or open limit, but not required both at once)
- [x] Limits tab -> when adding a new item to a group then it adds an empty item to the individual sites as well, when refreshing the page then htey disappear
- [x] Limit tab -> Add new site dialog -> Let's remove the quick presets, not needed
- [x] Groups tab -> When removing the value from the time or open limit and clicking update nothing seems to happen, when I refresh the page then the limit is gone, we should update the card after saving the changes so we don't need to refresh the page manually to let the user know the changes have been stored.
- [ ] Groups tab -> It's not possible to remove the time limit. When I remove the value from the input and update the group the time limit does not disappear. It should be possible to remove the time limit and only have a limit on number of opens instead (but at least one of hte two limits should be added)
-[ ] settings page background and header (with the name and icon) should be the same as the timout page one.

### Popup

- [x] Quick presets should have 2 lines, one for adding time limit, one for adding opens limit
- [x] It should only have one "add limit" button, not separately for time and open limit
- [x] It should have a working "add to group". The "add to group" button should be below "add limit" button divided by a ----- OR ------
- [x] The time limit and open limit preset buttons should not add the page limit immediately, they are there only to pick the value (the selection should be also highlighted by changing the button state, so it's visible which one is selected) and it should only add the limit when the "add limit" button is clicked, or it should disregard the selected limits and just add to a group whne "add to group" is clicked
- [x] The remaining time limit should be updated every 30 seconds on a limited site, to make sure it shows a close to real time value even when open for longer
- [x] Add to group should show a selector where the options are the available groups. When selecting an option it should add the page to the group and have the popup to refresh to show the limit
- [x] When we select an open and a time limit for a page in the popup quick add -> it should store both of the limits. Currently it only stores the limit for the time.
- [x] When I click add to group for a non-limited site and click on a specific group's button nothing happens. It does not add the site to the group. It should add it and refresh the popup to show the correct state of the group.
- [ ] When I click on the add to group button, then the groups appear as buttons that makes the popup be bigger than the allocated size and it introduces vertical and horizontal scrollbars. This is a bad experience so let's make sure the popup window can grow horizontally so the content fits inside.
- [ ] when extending limits for a site in a group, it does not actually get extended for said site
- [ ] after extending a sites limits, on the site the popup shows the original limits and not the extended limits
- [ ] after extending a sites limits, there should be an indication that we are spending extension time, not regular 
- [ ] Popup extending limits input always contains a 0 that is prefixed to whatever the user inputs. It should be a normal number input field.

### CICD
- [ ] https://github.com/marketplace/actions/publish-an-extension-on-firefox-addons-store
- [ ] https://github.com/marketplace/actions/publish-chrome-extension-to-chrome-web-store 
- [ ] https://developer.chrome.com/docs/webstore/using-api#beforeyoubegin
- **Consider renaming Firefox secrets for consistency**: Currently using `FIREFOX_ISSUER` and `FIREFOX_SECRET`. Mozilla docs call them "API Key" and "API Secret". Consider renaming to `FIREFOX_API_KEY` and `FIREFOX_API_SECRET` to match standard naming convention.
- [ ]


## Improvements

### General
- [x] Popup on the timeout page and settings should show something different, not the regular "not tracked"
- [x] Be able to extend current limit for a day, but needs an explanation of at least 35 characters this is somewhere not obvious on the timout page and the popup.
- [x] Clean clutter: Simplify code, create a "mental map document" and check what can be reused across pages, Delete dead code, delete unnecessary logging and error handling, delete mock data
- [x] Refactor to actually use locales, remove every hardcoded string in favor of this. 
- [ ] Be able to limit just a subdomain or a subpage (e.g. shorts.youtube.com or reddit.com/r/hungary or youtube.com/shorts)
- [ ] Add to every page a link to the plugin page review -> on successful things add a popup to ask the user if they like the user and rate it

### Settings page
- [x] be able to turn limits on or off by having a "switch" button next to each page in the limits tab (even on pages individually that are in a group) (reuse the one in the settings -> messages tab -> display options)

### Timeout page
- [x] when opening the timeout page randomize the order of the displayed messages (don't shuffle them in the storage) so we always see a different order when opening it, not always the same.

### Statistic pages
- [ ] Track how much time we spend on each site and how many times we open each site
- [ ] Track which page we try to open even after the limit is hit
- [ ] Make visualisations of tracked data
- [ ] Display changes or trends over days/weeks/months
- [ ] Suggest distracting pages to add limits to (but remember it's ok to spend time on pages that are not distracting: e.g. jira, github, etc.), if the user cancels a suggestion then let's remember and not try to suggest it again

### Info page
- [x] Create a basic info page that reuses the base of the timout page (background, header) and the theme and existing UI components as much as possible
- [x] The purpose of the page is to tell users what this extension is about, and ask them to donate for improvements or if they like it. It should contain an header, intro to the project, values (described in the next line)
- [x] Show what values the user gets: saving their time and being mindful about how they spend their online time, it's free - we just want more happy people on the planet, respecting privacy: not-tracking the user, not collecting data, everythign is stored locally and we don't have access to them, nothing is sent over the wire, it's ad free - user can opt in to get non disturbing ads to keep the project alive, donations are accepted
- [x] It should show the user that they can donate (stripe, paypal, buy me a coffee, patreon)
- [x] It should have links to report bugs and feature suggestions (github)
- [x] Add info page as a link to popup header, and settings page as well as timout page. make it prominent but not disturbing
- [x] Popup on info page should just show a similar message to how it is displayed on settings page, show a general text about being on the info page.
- [x] The info page should have a button to link to the settings page and also some short description about what to do to set up (max 2 lines)

### Onboarding
- [x] When starting the app for the first time we should have a "social media" group as an example with blue color and 30min 30 opens limit. 
- [x] Let's bootstrap the app on the first start/install with adding the default messages (so they are not only in the backend code, but added to the storage, and if the user removes the messages they are gone for real -> then the timeout page should say something about setting up messages and linking to the settings page)
- [x] When opening the settings page for the first time the user should get an onboarding flow. a setp by step process with info poups to go through the onboardin: - first setting up individual pages, then creting a group and then adding pages to groups, lastly about adding messages.
- [x] When opening the popup for hte first time it should welcome the user and tell them to set up sites, add a button to go to the settings
- [x] Detect install -> https://extensionworkshop.com/documentation/develop/onboard-upboard-offboard-users/