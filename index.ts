import { App } from "@slack/bolt"
import { PrismaClient, Status } from "@prisma/client"
const prisma = new PrismaClient()

import axios, { AxiosResponse } from "axios"

const top20URL = "https://github.com/KhushrajRathod/TheOverseerBackend/releases/download/Latest/20.json"
const leaderboardAllURL = "https://github.com/KhushrajRathod/TheOverseerBackend/releases/download/Latest/results.json"
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

app.command('/analytics-disable', async ({ command, ack }) => {
    await ack()
    const currentStatus = await getStatus(command.channel_id)
    if (currentStatus === Status.REJECTED) {
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

            await set(command.channel_id, Status.REJECTED)

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

app.command('/analytics-enable', async ({ command, ack }) => {
    await ack()
    const currentStatus = await getStatus(command.channel_id)
    if (currentStatus === Status.APPROVED) {
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
            await set(command.channel_id, Status.APPROVED)
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

// app.client.chat.postMessage({
//     token: process.env.token,
//     channel: "G01HZC1QFMX",
//     blocks: [
//         {
//             type: "section",
//             text: {
//                 type: "mrkdwn",
//                 text: `#${command.channel_name}: ${command.channel_id}`
//             }
//         },
//         {
//             type: "actions",
//             elements: [
//                 {
//                     type: "button",
//                     style: "primary",
//                     text: {
//                         type: "plain_text",
//                         text: "Approve"
//                     },
//                     value: command.channel_id,
//                     action_id: "approve"
//                 },
//                 {
//                     type: "button",
//                     style: "danger",
//                     text: {
//                         type: "plain_text",
//                         text: "Reject"
//                     },
//                     value: command.channel_id,
//                     action_id: "reject"
//                 }
//             ]
//         }
//     ]
// }).catch(_ => { })

app.command('/analytics-leaderboard', async ({ command, ack }) => {
    await ack()

    try {
        const top20: AxiosResponse<[string, number][]> = await axios.get(top20URL)
        
        let formattedText = ":chart_with_upwards_trend: Stats for the *past 30 days* (computed once every four hours)\n\n"

        for (let i = 0; i < top20.data.length; i++) {
            formattedText += `${i + 1}. ${top20.data[i][0]}: ${top20.data[i][1]}\n`
        }

        await app.client.chat.postEphemeral({
            token: process.env.token,
            channel: command.channel_id,
            user: command.user_id,
            text: formattedText
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

app.command('/analytics-personal', async ({ command, ack }) => {
    await ack()

    try {
        const results: AxiosResponse<[string, number][]> = await axios.get(leaderboardAllURL)
        
        let messages: number
        let rank: number

        for (let i = 0; i < results.data.length; i++) {
            if (results.data[i][0] === command.user_id) {
                messages = results.data[i][1]
                rank = i + 1
                break
            }
        }

        await app.client.chat.postEphemeral({
            token: process.env.token,
            channel: command.channel_id,
            user: command.user_id,
            text:
                ":chart_with_upwards_trend: Personal Stats for the *past 30 days* (computed once every four hours)\n" +
                `You posted ${messages} messages and are currently no. ${rank} in the leaderboard`
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

app.command('/analytics-user', async ({ command, ack }) => {
    await ack()

    try {
        const results: AxiosResponse<[string, number][]> = await axios.get(leaderboardAllURL)

        const regex = /<@(.*)\|.*>/
        const user = command.text.match(regex)

        let messages: number
        let rank: number

        for (let i = 0; i < results.data.length; i++) {
            if (results.data[i][0] === user[1]) {
                messages = results.data[i][1]
                rank = i + 1
                break
            }
        }

        await app.client.chat.postEphemeral({
            token: process.env.token,
            channel: command.channel_id,
            user: command.user_id,
            text:
                ":chart_with_upwards_trend: User Stats for the *past 30 days* (computed once every four hours)\n" +
                `<@${user[1]}> posted ${messages} messages and they are currently no. ${rank} in the leaderboard`
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


app.action('approve', async ({ body, ack }: any) => {
    await ack()
    await set(body.actions[0].value, Status.APPROVED)

    app.client.chat.update({
        token: process.env.token,
        channel: "G01HZC1QFMX",
        ts: body.message.ts,
        blocks: [],
        text: `<#${body.actions[0].value}> was approved by <@${body.user.id}>`
    })
})

app.action('reject', async ({ body, ack }: any) => {
    await ack()
    await set(body.actions[0].value, Status.REJECTED)

    app.client.chat.update({
        token: process.env.token,
        channel: "G01HZC1QFMX",
        ts: body.message.ts,
        blocks: [],
        text: `<#${body.actions[0].value}> was rejected by <@${body.user.id}>`
    })
})

async function getStatus(channel: string) {
    const response = await prisma.channel.upsert({
        where: { id: channel },
        create: {
            id: channel,
            status: Status.UNREVIEWED
        },
        update: {}
    })

    return response.status
}

async function set(channel: string, status: Status) {
    await prisma.channel.upsert({
        where: { id: channel },
        create: {
            id: channel,
            status: status
        },
        update: { status: status }
    })
}

async function main() {
    await app.start(process.env.PORT || 3000)
    console.log("👁 The Overseer Frontend running")
}

main()