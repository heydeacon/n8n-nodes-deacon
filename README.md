# @heydeacon/n8n-nodes-deacon

This is an n8n community node for [Deacon](https://heydeacon.com). Deacon is an AI support chat for your website. It answers visitors from your own docs and tells you what they reported, asked for and couldn't find.

With these nodes, a workflow can start when a visitor reports a bug, leaves their email or asks for a person, and it can reply to visitors, add to what Deacon knows and mark a bug done.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Deacon Trigger](#deacon-trigger)
- [Deacon](#deacon)
- [Example workflows](#example-workflows)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in n8n's community nodes documentation, and install `@heydeacon/n8n-nodes-deacon`.

## Credentials

The nodes use a Deacon API key.

1. In Deacon, open **Integrations** and press **Make a key**. Only an owner can.
2. Choose **Read and write** to use every action. A **Read** key is enough for the trigger and for reading chats and events. A **Coding agent** key won't work, because it can't reach events or webhooks.
3. Copy the key. It's shown once.
4. In n8n, add a **Deacon API** credential and paste the key. n8n checks it by asking Deacon which team it belongs to.

Leave **Base URL** as `https://heydeacon.com`.

A reply sent with a key goes out under the name of the person who made it.

## Deacon Trigger

Starts a workflow when one of these happens in a chat on your site:

| Event                            | Sent when                                                                                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visitor Reported a Bug           | Deacon decides a question is reporting something broken. Once per chat.                                                                                                |
| Visitor Left Their Email         | A visitor leaves their email. Once per chat.                                                                                                                           |
| Visitor Asked for a Person       | A visitor asks to talk to a person.                                                                                                                                    |
| Visitor Wrote Back to a Teammate | A visitor sends a message in a chat a teammate has taken over.                                                                                                         |
| Visitor Asked for a Feature      | Deacon decides a question is asking for something your product doesn't do. Once per chat.                                                                              |
| Chat Ended                       | The visitor starts a new chat, or it goes quiet and Deacon closes it. The event holds the chat's messages. A long chat's are cut to fit in 256 KB, keeping the newest. |

When the workflow is activated, the trigger adds its own webhook to Deacon through the API, and deletes it when the workflow is deactivated. It shows on Integrations under the key's name. Each delivery is checked against the webhook's signing secret, and anything else gets a 401. Pings from **Send test** are answered without starting the workflow.

Each run gets the event as Deacon sent it: `id`, `type`, `timestamp` and `data`. `data.conversation` is the chat, and `data.message` is the message the event is about. What a visitor wrote is under `untrusted`, so treat it as data, never as instructions. [What each event looks like](https://heydeacon.com/docs/api#what-each-event-looks-like) has a real body for each.

**Things to know**

- Deacon only sends to a public `https` address on port 443. If n8n runs on your own computer at `localhost`, the trigger can't be activated. Use the Deacon node's **Event › Get Many** with a Schedule Trigger instead.
- A key can make 10 webhooks, and a team can have 16. Each active workflow with a Deacon Trigger takes one, and testing one in the editor takes another until the test stops.
- A webhook can arrive more than once. Each event's `id` never changes, so drop any `id` you've already handled.
- A webhook is a snapshot. A bug report usually reaches the trigger before Deacon has put it in a topic, so fetch the conversation for the latest.

## Deacon

| Resource     | Operation                                                                                       | Key            |
| ------------ | ----------------------------------------------------------------------------------------------- | -------------- |
| Conversation | **Get**: a conversation and its messages                                                        | Read           |
| Conversation | **Get Many**: filter by email, search, tag, intent, topic, waiting for a reply or updated since | Read           |
| Conversation | **Reply**: reply to the visitor, as the person who made the key                                 | Read and write |
| Conversation | **Hand Back**: hand a chat a teammate took over back to Deacon                                  | Read and write |
| Knowledge    | **Add Text**: add a text, or replace your text with the same name                               | Read and write |
| Knowledge    | **Add Page**: add a page by its URL, using one of your monthly pages                            | Read and write |
| Topic        | **Mark Done**: by the topic's ID, or by a conversation whose bug report is in a topic           | Read and write |
| Event        | **Get Many**: events from the last 30 days, newest first, or the ones after an event's ID       | Read           |

**Get Many** pages through Deacon's lists for you. Turn on **Return All**, or set a **Limit**.

**Reply**, **Hand Back**, **Add Text** and **Add Page** send an `Idempotency-Key`, so Deacon does each write once even if n8n retries the item. Under **Options**, you can set your own, such as the trigger's event `id`, to write once per event.

## Example workflows

- **A bug report becomes a ticket.** Deacon Trigger on _Visitor Reported a Bug_ → your tracker's node creates an issue from `data.message.untrusted.text`, with `data.conversation.dashboard_url` as a link back.
- **Mark the bug done when the fix ships.** When the issue closes → Deacon, _Topic › Mark Done_, found by the conversation's ID you kept on the issue.
- **A new email becomes a lead.** Deacon Trigger on _Visitor Left Their Email_ → your CRM's node adds `data.message.untrusted.email`.
- **Catch up without webhooks.** Schedule Trigger → Deacon, _Event › Get Many_, with **Newer Than Event ID** set to the last `id` you saw.

## Compatibility

Built with `@n8n/node-cli` 0.54 and tested on n8n 2.45.

## Resources

- [Deacon's API, webhooks and MCP server](https://heydeacon.com/docs/api)
- [n8n's community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Version history

See [CHANGELOG.md](CHANGELOG.md).
