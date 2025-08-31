import React from 'react'

export function TypographyShowcase() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-left">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
          Typography System
        </h2>
        <p className="text-gray-600">
          A comprehensive typography system with consistent sizing, weights, and spacing.
        </p>
       
      </div>

      {/* Headings */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Headings</h3>
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Heading 1 (4xl)</h1>
            <p className="text-sm text-gray-500">Used for main page titles and hero sections</p>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Heading 2 (3xl)</h2>
            <p className="text-sm text-gray-500">Used for major section headers</p>
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Heading 3 (2xl)</h3>
            <p className="text-sm text-gray-500">Used for subsection headers</p>
          </div>
          <div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">Heading 4 (xl)</h4>
            <p className="text-sm text-gray-500">Used for minor section headers</p>
          </div>
          <div>
            <h5 className="text-lg font-medium text-gray-900 mb-2">Heading 5 (lg)</h5>
            <p className="text-sm text-gray-500">Used for card titles and small headers</p>
          </div>
          <div>
            <h6 className="text-base font-medium text-gray-900 mb-2">Heading 6 (base)</h6>
            <p className="text-sm text-gray-500">Used for the smallest headers</p>
          </div>
        </div>
      </div>

      {/* Body Text */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Body Text</h3>
        <div className="space-y-6">
          <div>
            <p className="text-lg text-gray-900 mb-2">Large Body Text (lg)</p>
            <p className="text-lg text-gray-700 leading-relaxed">
              This is large body text used for important content, introductions, and lead paragraphs. 
              It provides good readability while maintaining visual hierarchy.
            </p>
          </div>
          <div>
            <p className="text-base text-gray-900 mb-2">Base Body Text (base)</p>
            <p className="text-base text-gray-700 leading-relaxed">
              This is the standard body text size used throughout the application for most content. 
              It offers excellent readability and is the foundation of our typography system.
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-900 mb-2">Small Body Text (sm)</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              This is smaller text used for captions, metadata, and secondary information. 
              It's still readable but takes up less visual space.
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-900 mb-2">Extra Small Text (xs)</p>
            <p className="text-xs text-gray-700 leading-relaxed">
              This is the smallest text size used for labels, timestamps, and very compact information. 
              Use sparingly and ensure it remains legible.
            </p>
          </div>
        </div>
      </div>

      

      


    </div>
  )
}
