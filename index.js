const { App } = require("@slack/bolt")
const { readFileSync } = require("fs")
const sleepSynchronously = require('sleep-synchronously')
const { MongoClient, Collection } = require("mongodb")
const { getRelease } = require("get-release")
const fetch = require('node-fetch')

const dbURI = `mongodb+srv://Replit:${process.env.MONGODB_PASSWORD}@cluster0.ua8g4.mongodb.net/<dbname>?retryWrites=true&w=majority`

const client = new MongoClient(dbURI, { useUnifiedTopology: true })

let database
let collection

const admins = [
    "U01C21G88QM", // Khushraj
    "UARKJATPW", // Claire
    "UDFBPS5CZ", // Edwin
    "U013B6CPV62" // Caleb
]

const app = new App({
    signingSecret: process.env.signing_secret,
    token: process.env.token
})

app.start(process.env.PORT || 3000).then(async () => {
    client.connect().then(() => {
        database = client.db('Cluster0')
        collection = database.collection('channels')
        console.log("BOT RUNNING")

        app.command('/analytics-disable', async ({ command, ack, say }) => {
            await ack()
            const currentStatus = await getStatus(command.channel_id)
            if (currentStatus === "rejected") {
                app.client.chat.postEphemeral({
                    token: process.env.token,
                    channel: command.channel_id,
                    text: "Analytics for this channel are already disabled.",
                    user: command.user_id
                }).catch(_ => { })
            } else {
                if (admins.includes(command.user_id)) {
                    app.client.chat.postEphemeral({
                        token: process.env.token,
                        channel: command.channel_id,
                        text: "Disabling analytics for " + command.channel_id,
                        user: command.user_id
                    }).catch(_ => { })

                    await setRejected(command.channel_id)

                    app.client.chat.postMessage({
                        token: process.env.token,
                        channel: "G01HZC1QFMX",
                        text: `<#${command.channel_id}> was disabled by <@${command.user_id}>`
                    }).catch(_ => { })
                } else {
                    app.client.chat.postEphemeral({
                        token: process.env.token,
                        channel: command.channel_id,
                        text: "Unfortunately, you don't have sufficient permissions to disable analytics. Ping @analytics-review-team instead",
                        user: command.user_id
                    }).catch(_ => { })
                }
            }
        })

        app.command('/analytics-enable', async ({ command, ack, say }) => {
            await ack()
            const currentStatus = await getStatus(command.channel_id)
            if (currentStatus === "approved") {
                app.client.chat.postEphemeral({
                    token: process.env.token,
                    channel: command.channel_id,
                    text: "Analytics for this channel are already enabled! :yay:",
                    user: command.user_id
                }).catch(_ => { })
            } else {
                if (admins.includes(command.user_id)) {
                    await getStatus(command.channel_id)
                    app.client.chat.postEphemeral({
                        token: process.env.token,
                        channel: command.channel_id,
                        text: "Enabling analytics for " + command.channel_id,
                        user: command.user_id
                    }).catch(_ => { })
                    await setApproved(command.channel_id)
                    app.client.chat.postMessage({
                        token: process.env.token,
                        channel: "G01HZC1QFMX",
                        text: `<#${command.channel_id}> was enabled by <@${command.user_id}>`
                    }).catch(_ => { })
                } else {
                    app.client.chat.postEphemeral({
                        token: process.env.token,
                        channel: command.channel_id,
                        text: "Unfortunately, you don't have sufficient permissions to enable analytics. Run /analytics-apply instead",
                        user: command.user_id
                    }).catch(_ => { })
                }
            }
        })

        app.command('/analytics-apply', async ({ command, ack, say }) => {
            await ack()
            const currentStatus = await getStatus(command.channel_id)
            if (currentStatus === "approved") {
                app.client.chat.postEphemeral({
                    token: process.env.token,
                    channel: command.channel_id,
                    text: "Analytics for this channel are already enabled! :yay:",
                    user: command.user_id
                }).catch(_ => { })
            } else if (currentStatus === "pending") {
                app.client.chat.postEphemeral({
                    token: process.env.token,
                    channel: command.channel_id,
                    text: "The review team is currently reviewing this channel :clock1:",
                    user: command.user_id
                }).catch(_ => { })
            } else if (currentStatus === "rejected") {
                app.client.chat.postEphemeral({
                    token: process.env.token,
                    channel: command.channel_id,
                    text: "This channel has been rejected from analytics. If you think this is a mistake, ping @analytics-review-team",
                    user: command.user_id
                }).catch(_ => { })
            } else {
                app.client.chat.postEphemeral({
                    token: process.env.token,
                    channel: command.channel_id,
                    text: "I've sent a message to the review team",
                    user: command.user_id
                }).catch(_ => { })

                await setPending(command.channel_id)

                app.client.chat.postMessage({
                    token: process.env.token,
                    channel: "G01HZC1QFMX",
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `#${command.channel_name}: ${command.channel_id}`
                            }
                        },
                        {
                            type: "actions",
                            elements: [
                                {
                                    type: "button",
                                    style: "primary",
                                    text: {
                                        type: "plain_text",
                                        text: "Approve"
                                    },
                                    value: command.channel_id,
                                    action_id: "approve"
                                },
                                {
                                    type: "button",
                                    style: "danger",
                                    text: {
                                        type: "plain_text",
                                        text: "Reject"
                                    },
                                    value: command.channel_id,
                                    action_id: "reject"
                                }
                            ]
                        }
                    ]
                }).catch(_ => { })
            }
        })

        app.command('/analytics-leaderboard', async ({ command, ack, say }) => {
            await ack()

            let url = await getRelease(
                {
                    provider: "github",
                    user: "KhushrajRathod",
                    repo: "TheOverseer",
                    part: "20.json"
                }
            )

            try {
                const response = await fetch(url[0])
                const top20 = await response.json()

                let formattedText = ""

                for (let i = 0; i < top20.length; i++) {
                    formattedText += `${i + 1}. ${top20[i][0]}: ${top20[i][1]}\n`
                }

                await app.client.chat.postEphemeral({
                    token: process.env.token,
                    channel: command.channel_id,
                    user: command.user_id,
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: ":chart_with_upwards_trend: Stats for the *past 30 days* (computed hourly)"
                            }
                        },
                        {
                            type: "section",
                            text: {
                                type: "plain_text",
                                text: formattedText,
                                emoji: true
                            }
                        }
                    ]
                })
            } catch (e) {
                console.log(e)
                await app.client.chat.postEphemeral({
                    token: process.env.token,
                    channel: command.channel_id,
                    user: command.user_id,
                    text: "Error fetching leaderboard. Wait one minute for the Rate limit to reset, if errors continue, contact <@U01C21G88QM>"
                }).catch(_ => { })
            }
        })

        app.command('/analytics-personal', async ({ command, ack, say }) => {
            await ack()

            let url = await getRelease(
                {
                    provider: "github",
                    user: "KhushrajRathod",
                    repo: "TheOverseer",
                    part: "results.json"
                }
            )

            console.log(url)

            try {
                const response = await fetch(url[0])
                const results = await response.json()

                let messages
                let rank

                for (let i = 0; i < results.length; i++) {
                    if (results[i][0] === command.user_id) {
                        messages = results[i][1]
                        rank = i + 1
                        break
                    }
                }

                await app.client.chat.postEphemeral({
                    token: process.env.token,
                    channel: command.channel_id,
                    user: command.user_id,
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: ":chart_with_upwards_trend: Personal Stats for the *past 30 days* (computed hourly)"
                            }
                        },
                        {
                            type: "section",
                            text: {
                                type: "plain_text",
                                text: `You posted ${messages} messages and are currently no. ${rank} in the leaderboard`,
                            }
                        }
                    ]
                })
            } catch (e) {
                console.log(e)
                await app.client.chat.postEphemeral({
                    token: process.env.token,
                    channel: command.channel_id,
                    user: command.user_id,
                    text: "Error fetching leaderboard. Wait one minute for the Rate limit to reset, if errors continue, contact <@U01C21G88QM>"
                }).catch(_ => { })
            }
        })

        app.command('/analytics-user', async ({ command, ack, say }) => {
            await ack()

            let url = await getRelease(
                {
                    provider: "github",
                    user: "KhushrajRathod",
                    repo: "TheOverseer",
                    part: "results.json"
                }
            )

            try {
                const response = await fetch(url[0])
                const results = await response.json()

                const regex = /<@(.*)\|.*>/
                const user = command.text.match(regex)

                let messages
                let rank

                for (let i = 0; i < results.length; i++) {
                    if (results[i][0] === user[1]) {
                        messages = results[i][1]
                        rank = i + 1
                        break
                    }
                }

                await app.client.chat.postEphemeral({
                    token: process.env.token,
                    channel: command.channel_id,
                    user: command.user_id,
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: ":chart_with_upwards_trend: User Stats for the *past 30 days* (computed hourly)"
                            }
                        },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `<@${user[1]}> posted ${messages} messages and they are currently no. ${rank} in the leaderboard`,
                            }
                        }
                    ]
                })
            } catch (e) {
                console.log(e)
                await app.client.chat.postEphemeral({
                    token: process.env.token,
                    channel: command.channel_id,
                    user: command.user_id,
                    text: "Error fetching leaderboard. Wait one minute for the Rate limit to reset, if errors continue, contact <@U01C21G88QM>"
                }).catch(_ => { })
            }
        })

        app.action('approve', async ({ body, ack, say }) => {
            await ack()
            await setApproved(body.actions[0].value)

            app.client.chat.update({
                token: process.env.token,
                channel: "G01HZC1QFMX",
                ts: body.message.ts,
                blocks: [],
                text: `<#${body.actions[0].value}> was approved by <@${body.user.id}>`
            })
        })

        app.action('reject', async ({ body, ack, say }) => {
            await ack()
            await setRejected(body.actions[0].value)

            app.client.chat.update({
                token: process.env.token,
                channel: "G01HZC1QFMX",
                ts: body.message.ts,
                blocks: [],
                text: `<#${body.actions[0].value}> was rejected by <@${body.user.id}>`
            })
        })

        async function getStatus(channel) {
            try {
                const response = await collection.findOne({ channel: channel })
                return response.status
            } catch (e) {
                return undefined
            }
        }

        async function setApproved(channel) {
            await collection.updateOne({ channel: channel }, {
                "$set": {
                    status: "approved"
                }
            }, {
                    upsert: true
                })
        }

        async function setRejected(channel) {
            await collection.updateOne({ channel: channel }, {
                "$set": {
                    status: "rejected"
                }
            }, {
                    upsert: true
                })
        }

        async function setPending(channel) {
            await collection.updateOne({ channel: channel }, {
                "$set": {
                    status: "pending"
                }
            }, {
                    upsert: true
                })
        }
    })
})
