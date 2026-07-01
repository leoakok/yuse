const RESUME_SETTINGS_FIELDS = `
        resumeId
        themeId
        fontSize
        contactNameFontSize
        contactHeadlineFontSize
        contactDetailsFontSize
        sectionTitleFontSize
        itemTitleFontSize
        itemMetaFontSize
        pageFormat
        marginHorizontalMm
        marginVerticalMm
        showPhoto
        itemTitleLayout
        itemTitleSeparator
        itemTitleOrder
        fontFamily
        accentColor
        sectionDividerStyle
        dateFormat
        datePosition
        skillsLayout
        atsMode
        columnLayout
        sidebarPosition
        sidebarWidth
        designPresetId
        photoPosition
        photoSize
        contactLayout
        contactFields
        sectionSpacing
        itemSpacing
        descriptionStyle
        bulletChar
        itemTitleEmphasis
        highlightCurrentRole
        locationDisplay
        headingFontFamily
        bodyFontFamily
        nameFontWeight
        sectionTitleFontWeight
        lineHeight
        headingLetterSpacing
        sectionTitleCase
        textPrimaryColor
        textMutedColor
        pageBackground
        linkColor
        skillsProficiency
        languagesLayout
        certificationsLayout
        keepSectionsTogether
        maxItemsBeforeBreak
        footerStyle
        exportFilenameTemplate
        locale`;

/** GraphQL selection set for ResumeSettings (shared across queries and mutations). */
export const RESUME_SETTINGS_FRAGMENT = RESUME_SETTINGS_FIELDS;

export const RESUMES_QUERY = `
  query Resumes {
    resumes {
      id
      workspaceId
      title
      contactProfileId
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const RESUME_WITH_CONTENT_QUERY = `
  query ResumeWithContent($id: ID!) {
    resumeWithContent(id: $id) {
      resume {
        id
        workspaceId
        title
        contactProfileId
        createdBy
        createdAt
        updatedAt
      }
      contactProfile {
        id
        workspaceId
        fullName
        headline
        email
        phone
        location
        website
        linkedIn
        github
        photoUrl
        linkedinPhotoUrl
        githubPhotoUrl
        effectivePhotoUrl
        createdAt
        updatedAt
      }
      settings {
${RESUME_SETTINGS_FIELDS}
      }
      theme {
        id
        name
        slug
        isSystem
        config
      }
      sections {
        showInPreview
        displayTitle
        section {
          id
          workspaceId
          type
          title
          description
          createdBy
          createdAt
          updatedAt
        }
        items {
          id
          workspaceId
          type
          headline
          body
          metadata
          showInPreview
          createdBy
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const SECTIONS_QUERY = `
  query Sections($type: SectionType) {
    sections(type: $type) {
      id
      workspaceId
      type
      title
      description
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const SECTION_QUERY = `
  query Section($id: ID!) {
    section(id: $id) {
      id
      workspaceId
      type
      title
      description
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const SECTION_ITEMS_QUERY = `
  query SectionItems($type: SectionType) {
    sectionItems(type: $type) {
      id
      workspaceId
      type
      headline
      body
      metadata
      showInPreview
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const SECTION_ITEM_QUERY = `
  query SectionItem($id: ID!) {
    sectionItem(id: $id) {
      id
      workspaceId
      type
      headline
      body
      metadata
      showInPreview
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const SECTION_ITEM_USAGE_QUERY = `
  query SectionItemUsage($id: ID!) {
    sectionItemUsage(id: $id) {
      sectionItem {
        id
        workspaceId
        type
        headline
        body
        metadata
        showInPreview
        createdBy
        createdAt
        updatedAt
      }
      sections {
        id
        workspaceId
        type
        title
        description
        createdBy
        createdAt
        updatedAt
      }
      resumes {
        id
        workspaceId
        title
        contactProfileId
        createdBy
        createdAt
        updatedAt
      }
    }
  }
`;

export const SECTION_ITEMS_FOR_SECTION_QUERY = `
  query SectionItemsForSection($sectionId: ID!) {
    sectionItemsForSection(sectionId: $sectionId) {
      id
      workspaceId
      type
      headline
      body
      metadata
      showInPreview
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const RESUMES_FOR_SECTION_QUERY = `
  query ResumesForSection($sectionId: ID!) {
    resumesForSection(sectionId: $sectionId) {
      id
      workspaceId
      title
      contactProfileId
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const ME_QUERY = `
  query Me {
    me {
      id
      email
      displayName
      username
      avatarUrl
      role
      createdAt
      updatedAt
    }
  }
`;

export const WORKSPACE_BOOTSTRAP_QUERY = `
  query WorkspaceBootstrap {
    me {
      id
      email
      displayName
      username
      avatarUrl
      role
      createdAt
      updatedAt
    }
    myWorkspace {
      id
      name
      slug
      ownerId
      plan
      createdAt
      updatedAt
    }
  }
`;

export const MY_WORKSPACE_QUERY = `
  query MyWorkspace {
    myWorkspace {
      id
      name
      slug
      ownerId
      plan
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_RESUME_MUTATION = `
  mutation CreateResume($title: String!) {
    createResume(title: $title) {
      id
      workspaceId
      title
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const DUPLICATE_RESUME_MUTATION = `
  mutation DuplicateResume($id: ID!) {
    duplicateResume(id: $id) {
      id
      workspaceId
      title
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_RESUME_MUTATION = `
  mutation DeleteResume($id: ID!) {
    deleteResume(id: $id)
  }
`;

export const UPDATE_RESUME_SETTINGS_MUTATION = `
  mutation UpdateResumeSettings($input: UpdateResumeSettingsInput!) {
    updateResumeSettings(input: $input) {
${RESUME_SETTINGS_FIELDS}
    }
  }
`;

export const UPDATE_RESUME_SECTION_DISPLAY_TITLE_MUTATION = `
  mutation UpdateResumeSectionDisplayTitle($input: UpdateResumeSectionDisplayTitleInput!) {
    updateResumeSectionDisplayTitle(input: $input) {
      resume {
        id
        title
      }
      settings {
${RESUME_SETTINGS_FIELDS}
      }
      sections {
        showInPreview
        displayTitle
        section {
          id
          type
          title
        }
        items {
          id
          headline
          showInPreview
        }
      }
    }
  }
`;

export const REORDER_RESUME_SECTIONS_MUTATION = `
  mutation ReorderResumeSections($input: ReorderResumeSectionsInput!) {
    reorderResumeSections(input: $input) {
      resume {
        id
        workspaceId
        title
        contactProfileId
        createdBy
        createdAt
        updatedAt
      }
      contactProfile {
        id
        workspaceId
        fullName
        headline
        email
        phone
        location
        website
        linkedIn
        github
        photoUrl
        linkedinPhotoUrl
        githubPhotoUrl
        effectivePhotoUrl
        createdAt
        updatedAt
      }
      settings {
${RESUME_SETTINGS_FIELDS}
      }
      theme {
        id
        name
        slug
        isSystem
        config
      }
      sections {
        showInPreview
        displayTitle
        section {
          id
          workspaceId
          type
          title
          description
          createdBy
          createdAt
          updatedAt
        }
        items {
          id
          workspaceId
          type
          headline
          body
          metadata
          showInPreview
          createdBy
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const UPDATE_RESUME_SECTION_VISIBILITY_MUTATION = `
  mutation UpdateResumeSectionVisibility($input: UpdateResumeSectionVisibilityInput!) {
    updateResumeSectionVisibility(input: $input) {
      resume {
        id
        workspaceId
        title
        contactProfileId
        createdBy
        createdAt
        updatedAt
      }
      contactProfile {
        id
        workspaceId
        fullName
        headline
        email
        phone
        location
        website
        linkedIn
        github
        photoUrl
        linkedinPhotoUrl
        githubPhotoUrl
        effectivePhotoUrl
        createdAt
        updatedAt
      }
      settings {
${RESUME_SETTINGS_FIELDS}
      }
      theme {
        id
        name
        slug
        isSystem
        config
      }
      sections {
        showInPreview
        displayTitle
        section {
          id
          workspaceId
          type
          title
          description
          createdBy
          createdAt
          updatedAt
        }
        items {
          id
          workspaceId
          type
          headline
          body
          metadata
          showInPreview
          createdBy
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const UPDATE_RESUME_SECTION_ITEM_VISIBILITY_MUTATION = `
  mutation UpdateResumeSectionItemVisibility($input: UpdateResumeSectionItemVisibilityInput!) {
    updateResumeSectionItemVisibility(input: $input) {
      resume {
        id
        workspaceId
        title
        contactProfileId
        createdBy
        createdAt
        updatedAt
      }
      contactProfile {
        id
        workspaceId
        fullName
        headline
        email
        phone
        location
        website
        linkedIn
        github
        photoUrl
        linkedinPhotoUrl
        githubPhotoUrl
        effectivePhotoUrl
        createdAt
        updatedAt
      }
      settings {
${RESUME_SETTINGS_FIELDS}
      }
      theme {
        id
        name
        slug
        isSystem
        config
      }
      sections {
        showInPreview
        displayTitle
        section {
          id
          workspaceId
          type
          title
          description
          createdBy
          createdAt
          updatedAt
        }
        items {
          id
          workspaceId
          type
          headline
          body
          metadata
          showInPreview
          createdBy
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const UPDATE_RESUME_SECTION_ITEM_MUTATION = `
  mutation UpdateResumeSectionItem($input: UpdateResumeSectionItemInput!) {
    updateResumeSectionItem(input: $input) {
      resume {
        id
        workspaceId
        title
        contactProfileId
        createdBy
        createdAt
        updatedAt
      }
      contactProfile {
        id
        workspaceId
        fullName
        headline
        email
        phone
        location
        website
        linkedIn
        github
        photoUrl
        linkedinPhotoUrl
        githubPhotoUrl
        effectivePhotoUrl
        createdAt
        updatedAt
      }
      settings {
${RESUME_SETTINGS_FIELDS}
      }
      theme {
        id
        name
        slug
        isSystem
        config
      }
      sections {
        showInPreview
        displayTitle
        section {
          id
          workspaceId
          type
          title
          description
          createdBy
          createdAt
          updatedAt
        }
        items {
          id
          workspaceId
          type
          headline
          body
          metadata
          showInPreview
          createdBy
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const ADD_RESUME_SECTION_ITEM_MUTATION = `
  mutation AddResumeSectionItem($input: AddResumeSectionItemInput!) {
    addResumeSectionItem(input: $input) {
      resume {
        id
        workspaceId
        title
        contactProfileId
        createdBy
        createdAt
        updatedAt
      }
      contactProfile {
        id
        workspaceId
        fullName
        headline
        email
        phone
        location
        website
        linkedIn
        github
        photoUrl
        linkedinPhotoUrl
        githubPhotoUrl
        effectivePhotoUrl
        createdAt
        updatedAt
      }
      settings {
${RESUME_SETTINGS_FIELDS}
      }
      theme {
        id
        name
        slug
        isSystem
        config
      }
      sections {
        showInPreview
        displayTitle
        section {
          id
          workspaceId
          type
          title
          description
          createdBy
          createdAt
          updatedAt
        }
        items {
          id
          workspaceId
          type
          headline
          body
          metadata
          showInPreview
          createdBy
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const DELETE_SECTION_ITEM_MUTATION = `
  mutation DeleteSectionItem($resumeId: ID!, $sectionItemId: ID!) {
    deleteSectionItem(resumeId: $resumeId, sectionItemId: $sectionItemId) {
      resume {
        id
        workspaceId
        title
        contactProfileId
        createdBy
        createdAt
        updatedAt
      }
      contactProfile {
        id
        workspaceId
        fullName
        headline
        email
        phone
        location
        website
        linkedIn
        github
        photoUrl
        linkedinPhotoUrl
        githubPhotoUrl
        effectivePhotoUrl
        createdAt
        updatedAt
      }
      settings {
${RESUME_SETTINGS_FIELDS}
      }
      theme {
        id
        name
        slug
        isSystem
        config
      }
      sections {
        showInPreview
        displayTitle
        section {
          id
          workspaceId
          type
          title
          description
          createdBy
          createdAt
          updatedAt
        }
        items {
          id
          workspaceId
          type
          headline
          body
          metadata
          showInPreview
          createdBy
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const UPDATE_CONTACT_PROFILE_MUTATION = `
  mutation UpdateContactProfile($input: UpdateContactProfileInput!) {
    updateContactProfile(input: $input) {
      resume {
        id
        workspaceId
        title
        contactProfileId
        createdBy
        createdAt
        updatedAt
      }
      contactProfile {
        id
        workspaceId
        fullName
        headline
        email
        phone
        location
        website
        linkedIn
        github
        photoUrl
        linkedinPhotoUrl
        githubPhotoUrl
        effectivePhotoUrl
        createdAt
        updatedAt
      }
      settings {
${RESUME_SETTINGS_FIELDS}
      }
      theme {
        id
        name
        slug
        isSystem
        config
      }
      sections {
        showInPreview
        displayTitle
        section {
          id
          workspaceId
          type
          title
          description
          createdBy
          createdAt
          updatedAt
        }
        items {
          id
          workspaceId
          type
          headline
          body
          metadata
          showInPreview
          createdBy
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const REQUEST_PROFILE_PHOTO_UPLOAD_MUTATION = `
  mutation RequestProfilePhotoUpload($contentType: String!, $fileName: String!) {
    requestProfilePhotoUpload(contentType: $contentType, fileName: $fileName) {
      uploadUrl
      photoUrl
      contentType
      maxBytes
    }
  }
`;

export const ASSISTANT_THREADS_QUERY = `
  query AssistantThreads {
    assistantThreads {
      id
      workspaceId
      createdAt
      updatedAt
      preview
    }
  }
`;

export const ASSISTANT_MESSAGES_QUERY = `
  query AssistantMessages($threadId: ID!, $limit: Int) {
    assistantMessages(threadId: $threadId, limit: $limit) {
      id
      threadId
      role
      content
      context
      createdAt
    }
  }
`;

export const CREATE_ASSISTANT_THREAD_MUTATION = `
  mutation CreateAssistantThread {
    createAssistantThread {
      id
      workspaceId
      createdAt
      updatedAt
      preview
    }
  }
`;

export const DELETE_ASSISTANT_THREAD_MUTATION = `
  mutation DeleteAssistantThread($id: ID!) {
    deleteAssistantThread(id: $id)
  }
`;

const PORTFOLIO_WITH_CONTENT_FIELDS = `
  portfolio {
    id
    workspaceId
    title
    slug
    tagline
    about
    contactProfileId
    createdBy
    createdAt
    updatedAt
  }
  contactProfile {
    id
    workspaceId
    fullName
    headline
    email
    phone
    location
    website
    linkedIn
    github
    photoUrl
    linkedinPhotoUrl
    githubPhotoUrl
    effectivePhotoUrl
    ogImageUrl
    faviconUrl
    createdAt
    updatedAt
  }
  settings {
    portfolioId
    themeId
    layout
    accentColor
    showPhoto
    locale
    projectGridColumns
    projectCardStyle
    typographyScale
    heroStyle
    navigationStyle
    animationLevel
  }
  theme {
    id
    name
    slug
    isSystem
    config
  }
  projects {
    id
    portfolioId
    title
    tagline
    problem
    approach
    outcome
    techStack
    liveUrl
    repoUrl
    imageUrl
    featured
    showInPreview
    sortOrder
    createdAt
    updatedAt
  }
  skills {
    id
    portfolioId
    name
    category
    showInPreview
    sortOrder
  }
  testimonials {
    id
    portfolioId
    quote
    author
    role
    showInPreview
    sortOrder
  }
`;

export const SEND_ASSISTANT_MESSAGE_MUTATION = `
  mutation SendAssistantMessage(
    $threadId: ID!
    $text: String!
    $context: AssistantContextInput!
    $attachments: [AssistantAttachmentInput!]
  ) {
    sendAssistantMessage(
      threadId: $threadId
      text: $text
      context: $context
      attachments: $attachments
    ) {
      messages {
        id
        threadId
        role
        content
        context
        createdAt
      }
      actionLogs {
        id
        messageId
        op
        payload
        success
        error
        createdAt
      }
      affectedResumeIds
      affectedPortfolioIds
      resumeWithContent {
        resume {
          id
          workspaceId
          title
          contactProfileId
          createdBy
          createdAt
          updatedAt
        }
        contactProfile {
          id
          workspaceId
          fullName
          headline
          email
          phone
          location
          website
          linkedIn
          github
          photoUrl
          linkedinPhotoUrl
          githubPhotoUrl
          effectivePhotoUrl
          createdAt
          updatedAt
        }
        settings {
          resumeId
          themeId
          fontSize
          contactNameFontSize
          contactHeadlineFontSize
          contactDetailsFontSize
          sectionTitleFontSize
          itemTitleFontSize
          itemMetaFontSize
          pageFormat
          marginHorizontalMm
          marginVerticalMm
          showPhoto
          itemTitleLayout
        itemTitleSeparator
        itemTitleOrder
        locale
        }
        theme {
          id
          name
          slug
          isSystem
          config
        }
        sections {
          section {
            id
            workspaceId
            type
            title
            description
            createdBy
            createdAt
            updatedAt
          }
          items {
            id
            workspaceId
            type
            headline
            body
            metadata
            showInPreview
            createdBy
            createdAt
            updatedAt
          }
        }
      }
      portfolioWithContent {
        ${PORTFOLIO_WITH_CONTENT_FIELDS}
      }
    }
  }
`;

export const TWIN_ENTRIES_QUERY = `
  query TwinEntries {
    twinEntries {
      id
      workspaceId
      type
      title
      body
      metadata
      sortOrder
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_TWIN_ENTRY_MUTATION = `
  mutation CreateTwinEntry($input: CreateTwinEntryInput!) {
    createTwinEntry(input: $input) {
      id
      workspaceId
      type
      title
      body
      metadata
      sortOrder
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_TWIN_ENTRY_MUTATION = `
  mutation UpdateTwinEntry($input: UpdateTwinEntryInput!) {
    updateTwinEntry(input: $input) {
      id
      workspaceId
      type
      title
      body
      metadata
      sortOrder
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_TWIN_ENTRY_MUTATION = `
  mutation DeleteTwinEntry($id: ID!) {
    deleteTwinEntry(id: $id)
  }
`;

export const TRACKED_JOBS_QUERY = `
  query TrackedJobs {
    trackedJobs {
      id
      workspaceId
      url
      title
      company
      status
      notes
      resumeId
      coverLetter
      metadata
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_TRACKED_JOB_MUTATION = `
  mutation CreateTrackedJob($url: String!) {
    createTrackedJob(url: $url) {
      id
      workspaceId
      url
      title
      company
      status
      notes
      resumeId
      coverLetter
      metadata
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_TRACKED_JOB_MUTATION = `
  mutation UpdateTrackedJob($input: UpdateTrackedJobInput!) {
    updateTrackedJob(input: $input) {
      id
      workspaceId
      url
      title
      company
      status
      notes
      resumeId
      coverLetter
      metadata
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_TRACKED_JOB_MUTATION = `
  mutation DeleteTrackedJob($id: ID!) {
    deleteTrackedJob(id: $id)
  }
`;

export const CONNECTION_STATUS_QUERY = `
  query ConnectionStatus($provider: ConnectionProvider!) {
    connectionStatus(provider: $provider) {
      provider
      connected
      username
      avatarUrl
      connectedAt
    }
  }
`;

export const DISCONNECT_CONNECTION_MUTATION = `
  mutation DisconnectConnection($provider: ConnectionProvider!) {
    disconnectConnection(provider: $provider)
  }
`;

export const PORTFOLIOS_QUERY = `
  query Portfolios {
    portfolios {
      id
      workspaceId
      title
      slug
      contactProfileId
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const PORTFOLIO_WITH_CONTENT_QUERY = `
  query PortfolioWithContent($id: ID!) {
    portfolioWithContent(id: $id) {
      ${PORTFOLIO_WITH_CONTENT_FIELDS}
    }
  }
`;

export const CREATE_PORTFOLIO_MUTATION = `
  mutation CreatePortfolio($title: String!) {
    createPortfolio(title: $title) {
      id
      title
      createdAt
      updatedAt
    }
  }
`;

export const DUPLICATE_PORTFOLIO_MUTATION = `
  mutation DuplicatePortfolio($id: ID!) {
    duplicatePortfolio(id: $id) {
      id
      title
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_PORTFOLIO_MUTATION = `
  mutation DeletePortfolio($id: ID!) {
    deletePortfolio(id: $id)
  }
`;

export const UPDATE_PORTFOLIO_SETTINGS_MUTATION = `
  mutation UpdatePortfolioSettings($input: UpdatePortfolioSettingsInput!) {
    updatePortfolioSettings(input: $input) {
      portfolioId
      themeId
      layout
      accentColor
      showPhoto
      locale
      projectGridColumns
      projectCardStyle
      typographyScale
      heroStyle
      navigationStyle
      animationLevel
    }
  }
`;

export const UPDATE_PORTFOLIO_MUTATION = `
  mutation UpdatePortfolio($id: ID!, $title: String, $tagline: String, $about: String) {
    updatePortfolio(id: $id, title: $title, tagline: $tagline, about: $about) {
      id
      title
      tagline
      about
      updatedAt
    }
  }
`;

export const ADD_PORTFOLIO_PROJECT_MUTATION = `
  mutation AddPortfolioProject($input: AddPortfolioProjectInput!) {
    addPortfolioProject(input: $input) {
      ${PORTFOLIO_WITH_CONTENT_FIELDS}
    }
  }
`;

export const UPDATE_PORTFOLIO_PROJECT_MUTATION = `
  mutation UpdatePortfolioProject($input: UpdatePortfolioProjectInput!) {
    updatePortfolioProject(input: $input) {
      ${PORTFOLIO_WITH_CONTENT_FIELDS}
    }
  }
`;

export const DELETE_PORTFOLIO_PROJECT_MUTATION = `
  mutation DeletePortfolioProject($portfolioId: ID!, $projectId: ID!) {
    deletePortfolioProject(portfolioId: $portfolioId, projectId: $projectId) {
      ${PORTFOLIO_WITH_CONTENT_FIELDS}
    }
  }
`;

export const SET_PORTFOLIO_PROJECT_VISIBILITY_MUTATION = `
  mutation SetPortfolioProjectVisibility($input: SetPortfolioProjectVisibilityInput!) {
    setPortfolioProjectVisibility(input: $input) {
      ${PORTFOLIO_WITH_CONTENT_FIELDS}
    }
  }
`;

export const ADD_PORTFOLIO_SKILL_MUTATION = `
  mutation AddPortfolioSkill($input: AddPortfolioSkillInput!) {
    addPortfolioSkill(input: $input) {
      ${PORTFOLIO_WITH_CONTENT_FIELDS}
    }
  }
`;

export const UPDATE_PORTFOLIO_SKILL_MUTATION = `
  mutation UpdatePortfolioSkill($input: UpdatePortfolioSkillInput!) {
    updatePortfolioSkill(input: $input) {
      ${PORTFOLIO_WITH_CONTENT_FIELDS}
    }
  }
`;

export const DELETE_PORTFOLIO_SKILL_MUTATION = `
  mutation DeletePortfolioSkill($portfolioId: ID!, $skillId: ID!) {
    deletePortfolioSkill(portfolioId: $portfolioId, skillId: $skillId) {
      ${PORTFOLIO_WITH_CONTENT_FIELDS}
    }
  }
`;

export const ADD_PORTFOLIO_TESTIMONIAL_MUTATION = `
  mutation AddPortfolioTestimonial($input: AddPortfolioTestimonialInput!) {
    addPortfolioTestimonial(input: $input) {
      ${PORTFOLIO_WITH_CONTENT_FIELDS}
    }
  }
`;

export const UPDATE_PORTFOLIO_CONTACT_PROFILE_MUTATION = `
  mutation UpdatePortfolioContactProfile($input: UpdatePortfolioContactProfileInput!) {
    updatePortfolioContactProfile(input: $input) {
      ${PORTFOLIO_WITH_CONTENT_FIELDS}
    }
  }
`;

export const SET_USERNAME_MUTATION = `
  mutation SetUsername($username: String!) {
    setUsername(username: $username) {
      id
      username
      updatedAt
    }
  }
`;

export const SET_PORTFOLIO_SLUG_MUTATION = `
  mutation SetPortfolioSlug($portfolioId: ID!, $slug: String!) {
    setPortfolioSlug(portfolioId: $portfolioId, slug: $slug) {
      id
      slug
      updatedAt
    }
  }
`;

const KNOWLEDGE_ENTRY_FIELDS = `
  id
  slug
  title
  category
  tags
  body
  enabled
  createdAt
  updatedAt
`;

export const KNOWLEDGE_ENTRIES_QUERY = `
  query KnowledgeEntries($includeDisabled: Boolean) {
    knowledgeEntries(includeDisabled: $includeDisabled) {
      ${KNOWLEDGE_ENTRY_FIELDS}
    }
  }
`;

export const CLASSIFY_ASSISTANT_MESSAGE_QUERY = `
  query ClassifyAssistantMessage($text: String!, $context: AssistantContextInput!) {
    classifyAssistantMessage(text: $text, context: $context) {
      category
      confidence
      tags
      reason
      source
      scopeHandled
      cannedReply
      guidance
      selectedEntries {
        ${KNOWLEDGE_ENTRY_FIELDS}
      }
    }
  }
`;

export const CREATE_KNOWLEDGE_ENTRY_MUTATION = `
  mutation CreateKnowledgeEntry($input: CreateKnowledgeEntryInput!) {
    createKnowledgeEntry(input: $input) {
      ${KNOWLEDGE_ENTRY_FIELDS}
    }
  }
`;

export const UPDATE_KNOWLEDGE_ENTRY_MUTATION = `
  mutation UpdateKnowledgeEntry($input: UpdateKnowledgeEntryInput!) {
    updateKnowledgeEntry(input: $input) {
      ${KNOWLEDGE_ENTRY_FIELDS}
    }
  }
`;

export const DELETE_KNOWLEDGE_ENTRY_MUTATION = `
  mutation DeleteKnowledgeEntry($id: ID!) {
    deleteKnowledgeEntry(id: $id)
  }
`;
