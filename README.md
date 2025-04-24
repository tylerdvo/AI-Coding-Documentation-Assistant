# GPT Documentation Assistant

## Overview

GPT Documentation Assistant is a powerful Visual Studio Code extension that leverages AI to automatically generate and update code documentation across multiple programming languages.

## Features

- Generate documentation for functions using AI
- Update existing documentation
- Support for multiple programming languages
  - JavaScript
  - TypeScript
  - Python
  - Java
  - C#

## Requirements

- Visual Studio Code 1.99.0 or higher
- OpenAI API Key

## Installation

1. Install the extension from the Visual Studio Code Marketplace
2. Configure your OpenAI API Key in VSCode settings

## Configuration

### OpenAI API Key
1. Open VSCode Settings
2. Search for "GPT Documentation Assistant"
3. Enter your OpenAI API Key in the "Openai Api Key" field

### Documentation Standards
You can customize documentation standards for different languages in the extension settings:

```json
"gptDocAssistant.documentationStandards": {
  "javascript": "Use JSDoc format with detailed descriptions",
  "python": "Follow PEP 257 docstring conventions"
}
```

## Usage

### Generate Documentation
1. Place your cursor inside a function
2. Open the Command Palette (Cmd+Shift+P on macOS or Ctrl+Shift+P on Windows/Linux)
3. Run "GPT: Generate Documentation"

### Update Documentation
1. Place your cursor inside a function with existing documentation
2. Open the Command Palette
3. Run "GPT: Update Documentation"

## Supported Languages

- JavaScript/TypeScript
- Python
- Java
- C#

## Troubleshooting

- Ensure your OpenAI API Key is correctly configured
- Check that you're using a supported programming language
- Verify internet connectivity

## Privacy and Security

- Your code is sent to OpenAI for documentation generation
- No code is stored or logged by this extension

## Limitations

- Requires an active OpenAI API Key
- Documentation quality depends on OpenAI's GPT model
- May not perfectly capture complex or context-specific documentation needs

## Contributing

Contributions are welcome! Please submit issues and pull requests on our GitHub repository.

## License

[Specify your license]

## Release Notes

### 0.0.1
- Initial release
- Support for basic documentation generation
- Multi-language support

---

**Enjoy documenting your code with AI!**