# Contributing to Zlink

First off, thank you for considering contributing to Zlink! 🎉

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [issue list](https://github.com/trenchsheikh/zlink/issues) as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed after following the steps**
* **Explain which behavior you expected to see instead and why**
* **Include screenshots if possible**
* **Include your environment details** (Node.js version, OS, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as [GitHub issues](https://github.com/trenchsheikh/zlink/issues). Create an issue and provide the following information:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior and explain which behavior you expected to see instead**
* **Explain why this enhancement would be useful**

### Pull Requests

* Fill in the required template
* Follow the JavaScript/Node.js style guide
* Include screenshots and animated GIFs in your pull request whenever possible
* End all files with a newline
* Avoid platform-dependent code

## Development Process

1. **Fork the repo** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/YOUR-USERNAME/zlink.git
   cd zlink
   ```

3. **Create a branch** for your changes
   ```bash
   git checkout -b feature/amazing-feature
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Create a .env file** for testing
   ```bash
   cp .env.example .env
   # Edit .env with your test credentials
   ```

6. **Make your changes** and test them
   ```bash
   npm start
   ```

7. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add amazing feature"
   ```

8. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

9. **Create a Pull Request** on GitHub

## Coding Guidelines

### JavaScript Style

* Use ES6+ features
* Use async/await instead of callbacks
* Use meaningful variable names
* Comment complex logic
* Keep functions small and focused

### File Organization

* Keep related functionality in separate files
* Use consistent naming conventions
* Export only what needs to be public

### Error Handling

* Always catch and handle errors
* Provide meaningful error messages
* Log errors appropriately

### Security

* Never commit `.env` files
* Validate all user inputs
* Use prepared statements for database queries
* Follow security best practices

## Project Structure

```
zlink/
├── index.js              # Main application entry
├── bot.js                # Telegram bot handlers
├── evmMonitor.js         # EVM monitoring
├── solanaMonitor.js      # Solana monitoring
├── zcashService.js       # Zcash integration
├── magicLink.js          # Magic link logic
├── database.js           # Database operations
├── webServer.js          # Web server
├── config.js             # Configuration
└── package.json          # Dependencies
```

## Testing

Before submitting a PR:

1. **Test basic functionality**
   - Bot starts successfully
   - Commands work correctly
   - No console errors

2. **Test your specific changes**
   - Verify your feature works as expected
   - Test edge cases
   - Check error handling

3. **Check for breaking changes**
   - Ensure existing features still work
   - Update documentation if needed

## Documentation

* Update README.md if you change functionality
* Add JSDoc comments for new functions
* Update relevant .md files in the repo
* Include examples for new features

## Community

* Be respectful and constructive
* Help others when you can
* Follow the [Code of Conduct](CODE_OF_CONDUCT.md)

## Questions?

Feel free to:
* Open an issue for discussion
* Reach out on Telegram
* Check existing documentation

## Recognition

Contributors will be recognized in:
* The project README
* Release notes
* Project documentation

Thank you for contributing! 🚀

---

**Project**: [Zlink](https://github.com/trenchsheikh/zlink)  
**License**: MIT

