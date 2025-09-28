class KindroidAIClone {
    constructor() {
        this.characters = JSON.parse(localStorage.getItem('kindroid_characters') || '[]');
        this.currentCharacter = null;
        this.conversations = JSON.parse(localStorage.getItem('kindroid_conversations') || '{}');
        this.apiBase = 'http://localhost:11434/api';
        
        this.initializeEventListeners();
        this.loadAvailableModels();
        this.renderCharacters();
    }

    initializeEventListeners() {
        // Character management
        document.getElementById('newCharacterBtn').addEventListener('click', () => this.showCharacterModal());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.hideCharacterModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideCharacterModal());
        document.getElementById('characterForm').addEventListener('submit', (e) => this.createCharacter(e));
        
        // Chat interface
        document.getElementById('backBtn').addEventListener('click', () => this.showCharacterSelection());
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById('clearChatBtn').addEventListener('click', () => this.clearChat());
        
        // Close modal when clicking outside
        document.getElementById('characterModal').addEventListener('click', (e) => {
            if (e.target.id === 'characterModal') this.hideCharacterModal();
        });
    }

    async loadAvailableModels() {
        try {
            const response = await fetch(`${this.apiBase}/tags`);
            const data = await response.json();
            const select = document.getElementById('charModel');
            
            select.innerHTML = '<option value="">Select a model...</option>';
            
            if (data.models && data.models.length > 0) {
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.name;
                    select.appendChild(option);
                });
            } else {
                // Add default models if none are available
                const defaultModels = ['llama3.2', 'phi3', 'gemma2'];
                defaultModels.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading models:', error);
            // Add fallback models
            const select = document.getElementById('charModel');
            const fallbackModels = ['llama3.2', 'phi3', 'gemma2'];
            fallbackModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                select.appendChild(option);
            });
        }
    }

    renderCharacters() {
        const grid = document.getElementById('characterGrid');
        
        if (this.characters.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-robot text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">No AI Companions Yet</h3>
                    <p class="text-gray-500 mb-4">Create your first AI companion to get started!</p>
                    <button onclick="kindroidAI.showCharacterModal()" class="gradient-bg text-white px-6 py-3 rounded-lg hover:opacity-90 transition-all">
                        <i class="fas fa-plus mr-2"></i>Create Character
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.characters.map(character => `
            <div class="character-card bg-white rounded-lg shadow-md p-6 cursor-pointer" onclick="kindroidAI.selectCharacter('${character.id}')">
                <div class="text-center mb-4">
                    <div class="w-16 h-16 mx-auto rounded-full gradient-bg flex items-center justify-center text-white text-2xl mb-3">
                        <i class="fas fa-user"></i>
                    </div>
                    <h3 class="font-bold text-lg text-gray-800">${character.name}</h3>
                    <p class="text-sm text-gray-500">${character.model}</p>
                </div>
                <p class="text-gray-600 text-sm mb-4 line-clamp-3">${character.personality}</p>
                <div class="flex justify-between items-center text-sm text-gray-500">
                    <span><i class="fas fa-comments mr-1"></i>Chat</span>
                    <button onclick="event.stopPropagation(); kindroidAI.deleteCharacter('${character.id}')" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    showCharacterModal() {
        document.getElementById('characterModal').classList.remove('hidden');
        document.getElementById('characterModal').classList.add('flex');
    }

    hideCharacterModal() {
        document.getElementById('characterModal').classList.add('hidden');
        document.getElementById('characterModal').classList.remove('flex');
        document.getElementById('characterForm').reset();
    }

    createCharacter(e) {
        e.preventDefault();
        
        const name = document.getElementById('charName').value.trim();
        const personality = document.getElementById('charPersonality').value.trim();
        const model = document.getElementById('charModel').value;
        
        if (!name || !model) {
            alert('Please fill in all required fields');
            return;
        }
        
        const character = {
            id: Date.now().toString(),
            name,
            personality: personality || "A friendly and helpful AI companion",
            model,
            createdAt: new Date().toISOString()
        };
        
        this.characters.push(character);
        this.saveCharacters();
        this.renderCharacters();
        this.hideCharacterModal();
    }

    deleteCharacter(characterId) {
        if (confirm('Are you sure you want to delete this character?')) {
            this.characters = this.characters.filter(c => c.id !== characterId);
            delete this.conversations[characterId];
            this.saveCharacters();
            this.saveConversations();
            this.renderCharacters();
        }
    }

    selectCharacter(characterId) {
        this.currentCharacter = this.characters.find(c => c.id === characterId);
        if (!this.currentCharacter) return;
        
        this.showChatInterface();
        this.loadConversation();
    }

    showChatInterface() {
        document.getElementById('characterSelection').classList.add('hidden');
        document.getElementById('chatInterface').classList.remove('hidden');
        
        document.getElementById('characterName').textContent = this.currentCharacter.name;
        document.getElementById('messageInput').focus();
    }

    showCharacterSelection() {
        document.getElementById('chatInterface').classList.add('hidden');
        document.getElementById('characterSelection').classList.remove('hidden');
        this.currentCharacter = null;
    }

    loadConversation() {
        const conversation = this.conversations[this.currentCharacter.id] || [];
        const messagesContainer = document.getElementById('chatMessages');
        
        if (conversation.length === 0) {
            messagesContainer.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-comments text-4xl mb-2"></i>
                    <p>Start a conversation with ${this.currentCharacter.name}!</p>
                </div>
            `;
            return;
        }
        
        messagesContainer.innerHTML = conversation.map(msg => this.createMessageHTML(msg)).join('');
        this.scrollToBottom();
    }

    createMessageHTML(message) {
        const isUser = message.role === 'user';
        return `
            <div class="chat-bubble mb-4 ${isUser ? 'text-right' : 'text-left'}">
                <div class="inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isUser 
                        ? 'gradient-bg text-white rounded-br-none' 
                        : 'bg-white text-gray-800 shadow-md rounded-bl-none'
                }">
                    <p class="text-sm">${this.escapeHtml(message.content)}</p>
                    <p class="text-xs mt-1 opacity-70">${new Date(message.timestamp).toLocaleTimeString()}</p>
                </div>
            </div>
        `;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || !this.currentCharacter) return;
        
        input.value = '';
        input.disabled = true;
        document.getElementById('sendBtn').disabled = true;
        
        // Add user message
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        
        this.addMessageToConversation(userMessage);
        this.displayMessage(userMessage);
        this.showTypingIndicator();
        
        try {
            // Get AI response
            const response = await this.getAIResponse(message);
            
            const aiMessage = {
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString()
            };
            
            this.addMessageToConversation(aiMessage);
            this.displayMessage(aiMessage);
            
        } catch (error) {
            console.error('Error getting AI response:', error);
            const errorMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toISOString()
            };
            this.displayMessage(errorMessage);
        } finally {
            this.hideTypingIndicator();
            input.disabled = false;
            document.getElementById('sendBtn').disabled = false;
            input.focus();
        }
    }

    async getAIResponse(userMessage) {
        const conversation = this.conversations[this.currentCharacter.id] || [];
        
        // Build context with character personality and conversation history
        const systemMessage = `You are ${this.currentCharacter.name}. ${this.currentCharacter.personality}

Please respond as this character would, staying in character throughout the conversation. Be engaging, empathetic, and maintain the personality traits described above.`;

        const messages = [
            { role: 'system', content: systemMessage },
            ...conversation.slice(-10).map(msg => ({ role: msg.role, content: msg.content })), // Last 10 messages for context
            { role: 'user', content: userMessage }
        ];

        const response = await fetch(`${this.apiBase}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.currentCharacter.model,
                messages: messages,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.message.content;
    }

    addMessageToConversation(message) {
        if (!this.conversations[this.currentCharacter.id]) {
            this.conversations[this.currentCharacter.id] = [];
        }
        this.conversations[this.currentCharacter.id].push(message);
        this.saveConversations();
    }

    displayMessage(message) {
        const messagesContainer = document.getElementById('chatMessages');
        
        // Remove empty state if it exists
        const emptyState = messagesContainer.querySelector('.text-center');
        if (emptyState) {
            emptyState.remove();
        }
        
        const messageHTML = this.createMessageHTML(message);
        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        document.getElementById('typingIndicator').classList.remove('hidden');
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        document.getElementById('typingIndicator').classList.add('hidden');
    }

    clearChat() {
        if (!this.currentCharacter) return;
        
        if (confirm('Are you sure you want to clear this conversation?')) {
            this.conversations[this.currentCharacter.id] = [];
            this.saveConversations();
            this.loadConversation();
        }
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveCharacters() {
        localStorage.setItem('kindroid_characters', JSON.stringify(this.characters));
    }

    saveConversations() {
        localStorage.setItem('kindroid_conversations', JSON.stringify(this.conversations));
    }
}

// Initialize the application
const kindroidAI = new KindroidAIClone();