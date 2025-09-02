# AI-Powered Screenshot Import Feature

## Overview

The AI Screenshot Import feature allows users to upload a screenshot of a Miro board containing post-it notes with user journey examples and automatically extract structured Example data using AI vision services.

## Features

- **Drag & Drop Upload**: Easy file upload with drag and drop support
- **AI Vision Analysis**: Extracts text from post-it notes using AI
- **Smart Field Mapping**: Maps extracted text to Example fields (Actor, Goal, Entry Point, Actions, Error, Outcome)
- **Bulk Import**: Creates multiple Examples at once
- **Error Handling**: Shows detailed results of successful and failed imports
- **Preview & Validation**: Review extracted data before importing

## Architecture

### Frontend Components

1. **ScreenshotUploader** (`src/components/ScreenshotUploader.tsx`)
   - Main upload interface with drag & drop
   - Image preview and processing status
   - Extracted examples preview
   - Import confirmation

2. **ImportResultsNotification** (`src/components/ImportResultsNotification.tsx`)
   - Shows import results with success/failure counts
   - Displays failed examples with error details
   - Auto-dismisses after 5 seconds

3. **ExamplesSection** (updated)
   - Added "Import from Screenshot" button
   - Integrated with ScreenshotUploader
   - Handles bulk import results

### Backend Services

1. **AI Service** (`src/lib/aiService.ts`)
   - Main AI analysis interface
   - Mock implementation for development
   - Validation and enhancement utilities

2. **Bulk Import Service** (`src/lib/database/services/bulkExampleService.ts`)
   - Efficient bulk creation of Examples
   - Error handling and validation
   - Import statistics

3. **API Routes** (`api/ai/analyze-screenshot.ts`)
   - Serverless function for AI analysis
   - OpenAI Vision API integration
   - Fallback error handling

## Usage

### For Users

1. **Upload Screenshot**
   - Click "Import from Screenshot" in Examples section
   - Drag and drop or select image file
   - Wait for AI analysis (2-3 seconds)

2. **Review Extracted Data**
   - Preview extracted Examples in table format
   - Verify field mappings are correct
   - Upload different image if needed

3. **Import Examples**
   - Click "Import X Examples" to confirm
   - View import results notification
   - Examples appear in the Examples section

### For Developers

#### Adding New AI Service

```typescript
// In src/lib/aiService.ts
export const analyzeScreenshotWithNewService = async (base64Image: string): Promise<AIAnalysisResult> => {
  // Implementation
}
```

#### Customizing Field Mapping

```typescript
// In src/lib/aiService.ts
const customPrompt = `
Analyze this Miro board and extract:
- Actor: [custom mapping]
- Goal: [custom mapping]
// ... other fields
`
```

## AI Service Integration

### Current Implementation

- **Mock Service**: Returns sample data for development
- **Validation**: Ensures all required fields are present
- **Enhancement**: Cleans up text formatting

### Production Setup

#### OpenAI Vision API

1. **Environment Variables**
   ```bash
   OPENAI_API_KEY=your_api_key_here
   ```

2. **API Route** (`api/ai/analyze-screenshot.ts`)
   ```typescript
   const response = await openai.chat.completions.create({
     model: "gpt-4-vision-preview",
     messages: [{
       role: "user",
       content: [
         { type: "text", text: prompt },
         { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` }}
       ]
     }]
   })
   ```

#### Google Vision API

1. **Setup**
   ```bash
   GOOGLE_VISION_API_KEY=your_api_key_here
   ```

2. **Implementation**
   ```typescript
   const client = new vision.ImageAnnotatorClient()
   const [result] = await client.textDetection(imageBuffer)
   ```

#### Azure Computer Vision

1. **Setup**
   ```bash
   AZURE_VISION_ENDPOINT=your_endpoint
   AZURE_VISION_KEY=your_key
   ```

2. **Implementation**
   ```typescript
   const client = new ComputerVisionClient(endpoint, new ApiKeyCredentials({ in: "header", name: "Ocp-Apim-Subscription-Key", key }))
   ```

## Configuration

### File Size Limits

- **Maximum**: 10MB
- **Recommended**: 2-5MB for best performance
- **Formats**: PNG, JPG, JPEG, WebP

### AI Processing

- **Timeout**: 30 seconds
- **Retry Logic**: 3 attempts with exponential backoff
- **Fallback**: Multiple AI services for reliability

### Database

- **Bulk Insert**: Up to 100 examples per batch
- **Validation**: Server-side field validation
- **Error Handling**: Individual example failure tracking

## Error Handling

### Common Issues

1. **Image Quality**
   - Low resolution post-it notes
   - Blurry or distorted text
   - Poor contrast

2. **AI Service Failures**
   - API rate limits
   - Network timeouts
   - Invalid API keys

3. **Data Validation**
   - Missing required fields
   - Text too long for database
   - Invalid characters

### Error Messages

- **Upload Errors**: File type, size, format issues
- **Processing Errors**: AI service failures
- **Import Errors**: Database validation failures
- **Partial Success**: Some examples imported, others failed

## Performance

### Optimization

- **Image Compression**: Automatic resizing for large images
- **Caching**: AI results cached for 1 hour
- **Batch Processing**: Multiple examples in single request
- **Lazy Loading**: Components loaded on demand

### Monitoring

- **Processing Time**: Tracked for each analysis
- **Success Rate**: Monitored per AI service
- **Error Rates**: Categorized by error type
- **User Feedback**: Import success/failure rates

## Security

### Data Privacy

- **Image Storage**: Temporary, auto-deleted after processing
- **AI Data**: No permanent storage of user images
- **API Keys**: Secured environment variables
- **User Data**: Encrypted in transit and at rest

### Access Control

- **Authentication**: Required for all operations
- **Authorization**: Project-based access control
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Sanitizes all user inputs

## Testing

### Unit Tests

```typescript
// Test AI service
describe('aiService', () => {
  it('should extract examples from mock data', async () => {
    const result = await analyzeScreenshot(mockBase64Image)
    expect(result.examples).toHaveLength(2)
  })
})
```

### Integration Tests

```typescript
// Test full import flow
describe('Screenshot Import', () => {
  it('should import examples from screenshot', async () => {
    // Upload image, process, import, verify
  })
})
```

### E2E Tests

```typescript
// Test user workflow
describe('User Import Flow', () => {
  it('should complete full import process', async () => {
    // Navigate to Examples, upload, review, import
  })
})
```

## Future Enhancements

### Planned Features

1. **Smart Post-it Detection**
   - Color-based field mapping
   - Position-based organization
   - Template recognition

2. **Advanced AI**
   - Custom model training
   - Domain-specific prompts
   - Confidence scoring

3. **Batch Processing**
   - Multiple screenshot upload
   - Incremental imports
   - Template saving

4. **Quality Assurance**
   - Manual review workflow
   - Learning from corrections
   - Quality metrics

### Technical Improvements

1. **Performance**
   - Image preprocessing
   - Parallel processing
   - Result caching

2. **Reliability**
   - Multiple AI providers
   - Fallback mechanisms
   - Error recovery

3. **User Experience**
   - Progress indicators
   - Undo functionality
   - Import history

## Troubleshooting

### Common Problems

1. **"Failed to process image"**
   - Check image format and size
   - Verify AI service configuration
   - Check network connectivity

2. **"No examples extracted"**
   - Ensure post-it notes are clearly visible
   - Check image quality and resolution
   - Verify AI service is working

3. **"Import failed"**
   - Check database connection
   - Verify user permissions
   - Check field validation

### Debug Mode

Enable debug logging:

```typescript
// In aiService.ts
const DEBUG = process.env.NODE_ENV === 'development'
if (DEBUG) {
  console.log('AI Analysis Result:', result)
}
```

### Support

For issues or questions:
1. Check the error logs in browser console
2. Verify AI service configuration
3. Test with sample images
4. Contact development team

## Cost Considerations

### AI Service Costs

- **OpenAI Vision**: ~$0.01-0.05 per image
- **Google Vision**: ~$0.0015 per image
- **Azure Vision**: ~$0.001 per image

### Optimization

- **Image Compression**: Reduces processing costs
- **Batch Processing**: More efficient than individual requests
- **Caching**: Avoids duplicate processing
- **Fallback Services**: Cost-effective alternatives

## Conclusion

The AI Screenshot Import feature provides a powerful way to quickly populate Examples from Miro board screenshots. With proper AI service integration and error handling, it can significantly improve the user experience and reduce manual data entry.

For production deployment, ensure proper AI service configuration, monitoring, and user feedback mechanisms are in place.
