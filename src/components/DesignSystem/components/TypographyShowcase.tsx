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

      {/* Font Weights */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Font Weights</h3>
        <div className="space-y-4">
          <div>
            <p className="text-lg font-thin text-gray-900 mb-2">Thin (font-thin)</p>
            <p className="text-base font-thin text-gray-700">Lightweight text for subtle emphasis</p>
          </div>
          <div>
            <p className="text-lg font-light text-gray-900 mb-2">Light (font-light)</p>
            <p className="text-base font-light text-gray-700">Light weight for elegant typography</p>
          </div>
          <div>
            <p className="text-lg font-normal text-gray-900 mb-2">Normal (font-normal)</p>
            <p className="text-base font-normal text-gray-700">Standard weight for body text</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">Medium (font-medium)</p>
            <p className="text-base font-medium text-gray-700">Medium weight for emphasis</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 mb-2">Semibold (font-semibold)</p>
            <p className="text-base font-semibold text-gray-700">Semibold for strong emphasis</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 mb-2">Bold (font-bold)</p>
            <p className="text-base font-bold text-gray-700">Bold for maximum emphasis</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-gray-900 mb-2">Extra Bold (font-extrabold)</p>
            <p className="text-base font-extrabold text-gray-700">Extra bold for dramatic impact</p>
          </div>
        </div>
      </div>

      {/* Text Colors */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Text Colors</h3>
        <div className="space-y-4">
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">Primary Text (text-gray-900)</p>
            <p className="text-base text-gray-900">This is the primary text color used for headings and important content.</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-700 mb-2">Body Text (text-gray-700)</p>
            <p className="text-base text-gray-700">This is the standard body text color for most content.</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-600 mb-2">Secondary Text (text-gray-600)</p>
            <p className="text-base text-gray-600">This is secondary text color for less important information.</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-500 mb-2">Muted Text (text-gray-500)</p>
            <p className="text-base text-gray-500">This is muted text for captions and metadata.</p>
          </div>
          <div>
            <p className="text-lg font-medium text-blue-600 mb-2">Link Text (text-blue-600)</p>
            <p className="text-base text-blue-600">This is the color used for links and interactive text.</p>
          </div>
          <div>
            <p className="text-lg font-medium text-green-600 mb-2">Success Text (text-green-600)</p>
            <p className="text-base text-green-600">This is the color used for success messages and positive feedback.</p>
          </div>
          <div>
            <p className="text-lg font-medium text-red-600 mb-2">Error Text (text-red-600)</p>
            <p className="text-base text-red-600">This is the color used for error messages and warnings.</p>
          </div>
        </div>
      </div>

      {/* Text Utilities */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Text Utilities</h3>
        <div className="space-y-4">
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">Uppercase (uppercase)</p>
            <p className="text-base text-gray-700 uppercase">This text is transformed to uppercase</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">Lowercase (lowercase)</p>
            <p className="text-base text-gray-700 lowercase">THIS TEXT IS TRANSFORMED TO LOWERCASE</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">Capitalize (capitalize)</p>
            <p className="text-base text-gray-700 capitalize">this text has each word capitalized</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">Italic (italic)</p>
            <p className="text-base text-gray-700 italic">This text is displayed in italic style</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">Underline (underline)</p>
            <p className="text-base text-gray-700 underline">This text has an underline decoration</p>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">Line Through (line-through)</p>
            <p className="text-base text-gray-700 line-through">This text has a line through it</p>
          </div>
        </div>
      </div>


    </div>
  )
}
