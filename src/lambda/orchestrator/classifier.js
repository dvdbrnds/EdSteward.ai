/**
 * EdSteward.ai - Regulation Classifier Module
 * 
 * This module is responsible for classifying regulations based on their 
 * complexity, structure, and change frequency to determine the appropriate
 * validation approach.
 */

/**
 * Classification levels:
 * - Level 1: Static text regulations (simple, rarely change)
 * - Level 2: Semi-structured regulations (moderate complexity, occasional changes)
 * - Level 3: Complex regulations (frequent changes, context-sensitive validation)
 */

/**
 * Classify a regulation to determine the appropriate validation level
 * 
 * @param {Object} regulation - Regulation data
 * @param {number} requestedLevel - Requested validation level (can be overridden)
 * @returns {Promise<Object>} Classification result
 */
async function classifyRegulation(regulation, requestedLevel = 1) {
  // Get classification factors
  const complexityFactors = analyzeComplexity(regulation);
  const changeFrequency = await analyzeChangeFrequency(regulation);
  const structuralComplexity = analyzeStructure(regulation);
  
  // Calculate overall complexity score (0-100)
  const complexityScore = calculateComplexityScore(
    complexityFactors,
    changeFrequency,
    structuralComplexity
  );
  
  // Determine validation level based on complexity score
  let determinedLevel;
  if (complexityScore < 30) {
    determinedLevel = 1; // Simple static validation
  } else if (complexityScore < 70) {
    determinedLevel = 2; // Semi-structured validation
  } else {
    determinedLevel = 3; // Complex validation
  }
  
  // Use the higher of the requested level and determined level
  const validationLevel = Math.max(requestedLevel, determinedLevel);
  
  // Prepare classification result
  const classification = {
    regulationId: regulation.regulation_id,
    validationLevel,
    complexityScore,
    factors: {
      textComplexity: complexityFactors.textComplexity,
      contentSize: complexityFactors.contentSize,
      changeFrequency,
      structuralComplexity
    },
    // Determine the validator function to use
    validatorType: validationLevel === 1 ? 'text' : 
                   validationLevel === 2 ? 'pattern' : 'context'
  };
  
  return classification;
}

/**
 * Analyze the complexity of regulation text
 * 
 * @param {Object} regulation - Regulation data
 * @returns {Object} Complexity factors
 */
function analyzeComplexity(regulation) {
  // Text complexity factors
  const hasComplexLanguage = /\b(shall|must|according\sto|pursuant\sto|in\saccordance\swith)\b/i.test(regulation.title);
  const hasNumericRequirements = /\b\d+(\.\d+)?%|\b\d+\s+days\b|\$\s*\d+|\b\d+\s+years\b/i.test(regulation.title);
  const hasTechnicalTerms = /\b(compliance|threshold|requirement|standard|procedure|protocol)\b/i.test(regulation.title);
  
  // Estimate content size (using title as proxy since we don't have content here)
  const contentSize = regulation.title.length > 100 ? 'large' : 
                     regulation.title.length > 50 ? 'medium' : 'small';
  
  // Calculate text complexity (0-100)
  const textComplexityScore = 
    (hasComplexLanguage ? 20 : 0) +
    (hasNumericRequirements ? 20 : 0) +
    (hasTechnicalTerms ? 20 : 0) +
    (contentSize === 'large' ? 30 : 
     contentSize === 'medium' ? 15 : 0) +
    (regulation.category === 'Financial' ? 20 : 
     regulation.category === 'Policy' ? 15 : 10);
  
  return {
    textComplexity: textComplexityScore,
    contentSize: contentSize === 'large' ? 100 : 
                contentSize === 'medium' ? 50 : 25,
    hasComplexLanguage,
    hasNumericRequirements,
    hasTechnicalTerms
  };
}

/**
 * Analyze the change frequency of a regulation
 * 
 * @param {Object} regulation - Regulation data
 * @returns {Promise<number>} Change frequency score (0-100)
 */
async function analyzeChangeFrequency(regulation) {
  // For now, use the category as a proxy for change frequency
  // In a real implementation, this would query version history
  
  // Categories with typically high change frequency
  const highChangeCategories = [
    'Technology', 'Financial', 'Healthcare', 'Cybersecurity'
  ];
  
  // Categories with typically medium change frequency
  const mediumChangeCategories = [
    'Academic', 'Policy', 'Admissions', 'Student'
  ];
  
  // Determine change frequency score
  if (highChangeCategories.includes(regulation.category)) {
    return 75;
  } else if (mediumChangeCategories.includes(regulation.category)) {
    return 50;
  } else {
    return 25;
  }
}

/**
 * Analyze the structural complexity of a regulation
 * 
 * @param {Object} regulation - Regulation data
 * @returns {number} Structural complexity score (0-100)
 */
function analyzeStructure(regulation) {
  // For now, use the jurisdiction as a proxy for structural complexity
  // In a real implementation, this would analyze the actual structure
  
  // Jurisdictions with typically complex structure
  if (regulation.jurisdiction === 'Federal') {
    return 80;
  } else if (regulation.jurisdiction === 'State') {
    return 60;
  } else if (regulation.jurisdiction === 'Accreditation') {
    return 70;
  } else {
    return 40; // Local, institutional, etc.
  }
}

/**
 * Calculate overall complexity score
 * 
 * @param {Object} complexityFactors - Text complexity factors
 * @param {number} changeFrequency - Change frequency score
 * @param {number} structuralComplexity - Structural complexity score
 * @returns {number} Overall complexity score (0-100)
 */
function calculateComplexityScore(complexityFactors, changeFrequency, structuralComplexity) {
  // Weight factors
  const weights = {
    textComplexity: 0.3,
    contentSize: 0.2,
    changeFrequency: 0.3,
    structuralComplexity: 0.2
  };
  
  // Calculate weighted score
  const score = 
    (complexityFactors.textComplexity * weights.textComplexity) +
    (complexityFactors.contentSize * weights.contentSize) +
    (changeFrequency * weights.changeFrequency) +
    (structuralComplexity * weights.structuralComplexity);
  
  return Math.min(100, Math.max(0, Math.round(score)));
}

module.exports = {
  classifyRegulation
};
