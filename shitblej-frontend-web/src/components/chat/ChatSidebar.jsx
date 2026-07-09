import React from 'react';

const ChatSidebar = ({ conversations, selectedId, onSelect }) => {
    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
                <h2 className="text-xl font-bold dark:text-white">Messages</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => (
                    <div
                        key={conv.id}
                        onClick={() => onSelect(conv)}
                        className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${
                            selectedId === conv.id ? 'bg-green-50 dark:bg-zinc-800 border-l-4 border-green-500' : ''
                        }`}
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                            <img 
                                src={conv.avatar || "https://via.placeholder.com/150"} 
                                alt={conv.name} 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{conv.name}</h3>
                                <span className="text-xs text-gray-500">{conv.time}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {conv.lastMessage}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChatSidebar;
