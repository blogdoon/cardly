import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Database, ShieldCheck, Key, RefreshCw } from 'lucide-react';
import { isFirebaseConfigured, testFirestoreConnection, getFirebaseConfig } from '../services/firebase';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({ isOpen, onClose }) => {
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const config = getFirebaseConfig();

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    const res = await testFirestoreConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-amber-500 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Firebase & Google Auth Setup</h2>
              <p className="text-xs text-rose-100">Live Database, Storage & Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-sm text-slate-700">
          {/* Status badge */}
          <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
            isFirebaseConfigured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {isFirebaseConfigured ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-base">
                {isFirebaseConfigured
                  ? 'Connected to Live Firebase Project'
                  : 'Running in Test & Preview Mode'}
              </div>
              <p className="text-xs mt-1 leading-relaxed">
                {isFirebaseConfigured
                  ? `Active project: ${config.projectId}. Real Firestore, Storage, and Google Login are active.`
                  : 'The application runs with seamless local storage persistence, responsive interactive card editing, sample orders, and simulated Google authentication. You can connect your live Firebase project below anytime.'}
              </p>
            </div>
          </div>

          {/* Setup steps */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-rose-500" /> Connecting Your Real Firebase Project:
            </h3>
            <ol className="list-decimal pl-5 space-y-2 text-xs leading-relaxed text-slate-600">
              <li>
                Open the <strong className="text-slate-800">Firebase Console</strong> (<a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-rose-600 underline">console.firebase.google.com</a>) and create or select your project.
              </li>
              <li>
                Navigate to <strong>Project Settings &gt; General &gt; Your apps</strong> and add a <strong>Web App</strong>.
              </li>
              <li>
                Under <strong>Authentication &gt; Sign-in method</strong>, enable the <strong>Google</strong> provider.
              </li>
              <li>
                Under <strong>Firestore Database</strong>, create a database in production mode.
              </li>
              <li>
                Under <strong>Storage</strong>, create a storage bucket for card customer photo uploads.
              </li>
              <li>
                Add the following keys to your <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono">.env</code> file:
              </li>
            </ol>

            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-xs overflow-x-auto select-all">
              VITE_FIREBASE_API_KEY="your-api-key"<br />
              VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"<br />
              VITE_FIREBASE_PROJECT_ID="your-project-id"<br />
              VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"<br />
              VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"<br />
              VITE_FIREBASE_APP_ID="your-app-id"
            </div>
          </div>

          {/* Test connection button */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-medium text-xs hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            {testResult && (
              <span className={`text-xs font-medium ${testResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                {testResult.message}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Security rules ready in <code className="font-mono text-slate-700">firestore.rules</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
