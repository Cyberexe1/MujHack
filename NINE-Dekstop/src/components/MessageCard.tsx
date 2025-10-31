import { MessageEnvelope } from '../types/message';
import { MeshGraph } from './MeshGraph';
import { Clock, MapPin, User, Phone } from 'lucide-react';
import { useState } from 'react';

interface MessageCardProps {
  message: MessageEnvelope;
  onViewDetails?: () => void;
}

export function MessageCard({ message, onViewDetails }: MessageCardProps) {
  const [showGraph, setShowGraph] = useState(false);
  const timeAgo = getTimeAgo(message.timestamp);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {message.type === 'broadcast' ? (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                BROADCAST
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                ENCRYPTED
              </span>
            )}
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
          </div>

          {message.type === 'broadcast' ? (
            <p className="text-gray-900 font-medium mb-2">{message.payload}</p>
          ) : (
            <div className="bg-gray-100 p-2 rounded text-sm font-mono text-gray-600 mb-2">
              {message.payload.substring(0, 100)}...
            </div>
          )}

          {message.meta && (
            <div className="space-y-1 text-sm text-gray-600">
              {message.meta.name && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{message.meta.name}</span>
                </div>
              )}
              {message.meta.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{message.meta.location}</span>
                </div>
              )}
              {message.meta.contact && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span>{message.meta.contact}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => setShowGraph(!showGraph)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {showGraph ? 'Hide' : 'Show'} Mesh Path ({message.hops.length} hops)
        </button>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-xs text-gray-600 hover:text-gray-700 font-medium"
          >
            View Details →
          </button>
        )}
      </div>

      {showGraph && (
        <div className="mt-3">
          <MeshGraph messagePath={message.hops} />
        </div>
      )}
    </div>
  );
}

function getTimeAgo(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

