module.exports = {
    apps: [
        {
            name: 'ichem-web',
            script: 'server.js', // Using custom server.js
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        },
        {
            name: 'ichem-ml',
            script: 'ml_service.py',
            interpreter: 'python3', // Use system python or venv python
            args: '',
            env: {
                PORT: 5000
            }
        }
    ]
}
