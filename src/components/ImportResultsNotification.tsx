import React from 'react'
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Card } from './DesignSystem/components/Card'
import type { BulkImportResult } from '../lib/database/services/bulkExampleService'

interface ImportResultsNotificationProps {
  result: BulkImportResult
  onClose: () => void
}

export const ImportResultsNotification: React.FC<ImportResultsNotificationProps> = ({
  result,
  onClose
}) => {
  const isSuccess = result.totalFailed === 0
  const isPartialSuccess = result.totalSuccessful > 0 && result.totalFailed > 0
  const isFailure = result.totalSuccessful === 0

  const getStatusIcon = () => {
    if (isSuccess) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (isPartialSuccess) return <AlertCircle className="h-5 w-5 text-yellow-600" />
    return <X className="h-5 w-5 text-red-600" />
  }

  const getStatusColor = () => {
    if (isSuccess) return 'border-green-200 bg-green-50'
    if (isPartialSuccess) return 'border-yellow-200 bg-yellow-50'
    return 'border-red-200 bg-red-50'
  }

  const getStatusText = () => {
    if (isSuccess) return 'Import Successful'
    if (isPartialSuccess) return 'Import Partially Successful'
    return 'Import Failed'
  }

  const getStatusMessage = () => {
    if (isSuccess) {
      return `Successfully imported ${result.totalSuccessful} example${result.totalSuccessful === 1 ? '' : 's'}.`
    }
    if (isPartialSuccess) {
      return `Imported ${result.totalSuccessful} of ${result.totalProcessed} examples. ${result.totalFailed} failed.`
    }
    return `Failed to import ${result.totalProcessed} example${result.totalProcessed === 1 ? '' : 's'}.`
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card className={`border-l-4 ${getStatusColor()}`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getStatusIcon()}
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-gray-900">
                {getStatusText()}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {getStatusMessage()}
              </p>
              
              {/* Show failed examples if any */}
              {result.totalFailed > 0 && (
                <div className="mt-3">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-700 hover:text-gray-900">
                      View {result.totalFailed} failed example{result.totalFailed === 1 ? '' : 's'}
                    </summary>
                    <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                      {result.failed.map((failure, index) => (
                        <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <p className="font-medium text-red-800">
                            {failure.example.actor || 'Unknown Actor'}
                          </p>
                          <p className="text-red-600">
                            {failure.error}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
            <div className="ml-4 flex-shrink-0">
              <Button
                onClick={onClose}
                variant="ghost"
                size="small"
                icon={X}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
