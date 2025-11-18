# Drafts Action - Get ChatGPT Conversation

A Drafts action script that imports ChatGPT shared conversations into clean, formatted Markdown.

## Features

- Fetches ChatGPT shared conversations via the backend API
- Converts conversations to clean Markdown format
- Removes entity annotations and citation tags
- Cleans up URLs (removes tracking parameters)
- Converts raw URLs to Markdown links
- Preserves conversation structure with clear User/ChatGPT headers

## Installation

1. Copy the contents of `Drafts Action Get ChatGPT Convo.js`
2. In Drafts app, create a new Action
3. Add a Script step
4. Paste the code
5. Save the action

## Usage

1. Create a new draft in Drafts
2. Paste a ChatGPT share URL (e.g., `https://chatgpt.com/share/xxxxx`)
3. Run the action
4. A new draft will be created with the formatted conversation

## Known Issues

- Entity annotations using unicode quotes may not be fully removed
- Citation links are removed but not replaced with actual URLs (API limitation)

## Version History

- **v1.0**: Initial version with basic import and cleanup functionality

## License

Personal use project
