import React from 'react'
import { Zap, Clock } from 'lucide-react'

export function PromptBuilderSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Prompt Builder</h2>
        <p className="text-gray-600">AI-powered prompt generation for design research</p>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
        <div className="w-20 h-20 bg-gradient-to-br rounded-full flex items-center justify-center mx-auto mb-6" style={{
          background: 'linear-gradient(to bottom right, #6b42d1, #2563eb)'
        }}>
          <Zap size={32} className="text-white" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Feature Coming Soon</h3>
        
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          We're building an intelligent prompt builder to help you generate targeted research questions 
          and interview guides based on your project stakeholders and objectives.
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Clock size={16} />
          <span>Expected release: Q2 2025</span>
        </div>
        
        {/* Preview Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span className="text-blue-600 text-sm font-bold">AI</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Smart Prompts</h4>
            <p className="text-xs text-gray-600">AI-generated questions tailored to your stakeholders</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span className="text-green-600 text-sm font-bold">📋</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Interview Guides</h4>
            <p className="text-xs text-gray-600">Structured guides for stakeholder interviews</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: 'rgba(107, 66, 209, 0.1)' }}>
          <span className="text-sm font-bold" style={{ color: '#6b42d1' }}>🎯</span>
        </div>
            <h4 className="font-medium text-gray-900 mb-1">Targeted Research</h4>
            <p className="text-xs text-gray-600">Context-aware prompts based on project data</p>
          </div>
        </div>
      </div>
    </div>
  )
}