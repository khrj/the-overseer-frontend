# The Overseer (Frontend)

This repository contains the source for @TheOverseer, the analytics bot at Hack Club.

The Overseer is split into

- [The Backend](https://github.com/khrj/the-overseer-backend) -- A script that runs on the hour and computes Analytics
- The Frontend (This) -- Listeners for the bot's slash commands and channel-join events
- [Extras](https://github.com/khrj/TheOverseerExtras) -- Extra features for The Overseer

## Running

Run

```bash
yarn start
```

to start listening for Slack events

## Commands

### Everyone

- `/analytics-apply` - Apply to add a channel to Hack Club Analytics. This should be run by every member, in every channel, provided that the channel has humans talking to each other.
    - Examples of channels that qualify:
        - [#lounge](javascript:void(0))
        - [#code](javascript:void(0))
        - [#confessions](javascript:void(0))
    
    - Examples of channels that don't qualify:
        - [#xyzusercountstoamillion](javascript:void(0))
        - [#spam](javascript:void(0))
        - [#bot-spam](javascript:void(0))
        - [#sandbox](javascript:void(0))

- `/analytics-leaderboard` - Show the Analytics leaderboard
- `/analytics-personal` - Show your own position in the leaderboard and the amount of messages you've posted
- `/analytics-user @abcuser` - Show a particular user's position in the leaderboard and the amound of messages they've posted 

### Admins-only

- `/analytics-enable` - Enable Analytics for a channel
- `/analytics-disable` - Disable Analytics for a channel
