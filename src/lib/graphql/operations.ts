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
      slug
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
          customKey
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
      slug
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
      hasPasswordCredential
      hasGoogleCredential
      canChangeEmail
      emailVerified
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
      hasPasswordCredential
      hasGoogleCredential
      canChangeEmail
      emailVerified
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
          customKey
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
          customKey
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
          customKey
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
          customKey
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
          customKey
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
          customKey
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
          customKey
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

export const CHANGE_PASSWORD_MUTATION = `
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;

export const SET_PASSWORD_MUTATION = `
  mutation SetPassword($newPassword: String!) {
    setPassword(newPassword: $newPassword)
  }
`;

export const REMOVE_PASSWORD_MUTATION = `
  mutation RemovePassword {
    removePassword
  }
`;

export const UNLINK_GOOGLE_MUTATION = `
  mutation UnlinkGoogle {
    unlinkGoogle
  }
`;

export const CHANGE_EMAIL_MUTATION = `
  mutation ChangeEmail($currentPassword: String!, $email: String!) {
    changeEmail(currentPassword: $currentPassword, email: $email) {
      id
      email
      emailVerified
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

export const SET_RESUME_SLUG_MUTATION = `
  mutation SetResumeSlug($resumeId: ID!, $slug: String!) {
    setResumeSlug(resumeId: $resumeId, slug: $slug) {
      id
      slug
      updatedAt
    }
  }
`;

export const RESEND_VERIFICATION_EMAIL_MUTATION = `
  mutation ResendVerificationEmail {
    resendVerificationEmail
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

const ADMIN_USER_FIELDS = `
  id
  email
  displayName
  role
  isActive
  createdAt
  updatedAt
`;

const WAITLIST_ENTRY_FIELDS = `
  id
  email
  status
  submittedAt
  reviewedAt
  reviewedBy
`;

const ADMIN_AUDIT_FIELDS = `
  id
  actorId
  actorEmail
  action
  targetType
  targetId
  metadata
  createdAt
`;

export const ADMIN_USERS_QUERY = `
  query AdminUsers {
    adminUsers {
      ${ADMIN_USER_FIELDS}
    }
  }
`;

export const ADMIN_WAITLIST_QUERY = `
  query AdminWaitlist($status: WaitlistStatus) {
    adminWaitlist(status: $status) {
      ${WAITLIST_ENTRY_FIELDS}
    }
  }
`;

export const ADMIN_AUDIT_LOG_QUERY = `
  query AdminAuditLog($limit: Int, $offset: Int) {
    adminAuditLog(limit: $limit, offset: $offset) {
      ${ADMIN_AUDIT_FIELDS}
    }
  }
`;

export const ADMIN_LINKEDIN_GEO_SEARCH_QUERY = `
  query AdminLinkedInGeoSearch($keywords: String!) {
    adminLinkedInGeoSearch(keywords: $keywords) {
      geoId
      label
    }
  }
`;

export const ADMIN_LINKEDIN_JOB_SEARCH_QUERY = `
  query AdminLinkedInJobSearch(
    $keywords: String
    $geoId: String
    $timeFilter: String
    $sortBy: LinkedInJobSortBy
    $maxResults: Int
    $workplaceTypes: [LinkedInWorkplaceType!]
    $experienceLevels: [LinkedInExperienceLevel!]
    $employmentTypes: [LinkedInEmploymentType!]
    $easyApply: Boolean
    $sessionCookie: String
  ) {
    adminLinkedInJobSearch(
      keywords: $keywords
      geoId: $geoId
      timeFilter: $timeFilter
      sortBy: $sortBy
      maxResults: $maxResults
      workplaceTypes: $workplaceTypes
      experienceLevels: $experienceLevels
      employmentTypes: $employmentTypes
      easyApply: $easyApply
      sessionCookie: $sessionCookie
    ) {
      jobId
      title
      company
      location
      workplaceType
      employmentType
      listedAt
      description
      url
    }
  }
`;

export const APPROVE_WAITLIST_ENTRY_MUTATION = `
  mutation ApproveWaitlistEntry($id: ID!) {
    approveWaitlistEntry(id: $id) {
      ${WAITLIST_ENTRY_FIELDS}
    }
  }
`;

export const REJECT_WAITLIST_ENTRY_MUTATION = `
  mutation RejectWaitlistEntry($id: ID!) {
    rejectWaitlistEntry(id: $id) {
      ${WAITLIST_ENTRY_FIELDS}
    }
  }
`;

export const SET_USER_ACTIVE_MUTATION = `
  mutation SetUserActive($userId: ID!, $active: Boolean!) {
    setUserActive(userId: $userId, active: $active) {
      ${ADMIN_USER_FIELDS}
    }
  }
`;

export const SET_USER_ROLE_MUTATION = `
  mutation SetUserRole($userId: ID!, $role: UserRole!) {
    setUserRole(userId: $userId, role: $role) {
      ${ADMIN_USER_FIELDS}
    }
  }
`;

export const SEND_TEST_EMAIL_MUTATION = `
  mutation SendTestEmail($type: TestEmailType!, $recipientEmail: String!) {
    sendTestEmail(type: $type, recipientEmail: $recipientEmail) {
      success
      message
    }
  }
`;

const INVITE_LINK_FIELDS = `
  id
  code
  label
  emailRestrict
  maxUses
  useCount
  isActive
  createdAt
  expiresAt
  urlPath
`;

export const ADMIN_INVITE_LINKS_QUERY = `
  query AdminInviteLinks {
    adminInviteLinks {
      ${INVITE_LINK_FIELDS}
    }
  }
`;

export const CREATE_INVITE_LINK_MUTATION = `
  mutation CreateInviteLink($input: CreateInviteLinkInput!) {
    createInviteLink(input: $input) {
      ${INVITE_LINK_FIELDS}
    }
  }
`;

export const UPDATE_INVITE_LINK_MUTATION = `
  mutation UpdateInviteLink($input: UpdateInviteLinkInput!) {
    updateInviteLink(input: $input) {
      ${INVITE_LINK_FIELDS}
    }
  }
`;

export const CREATE_RESUME_SECTION_MUTATION = `
  mutation CreateResumeSection($input: CreateResumeSectionInput!) {
    createResumeSection(input: $input) {
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
          customKey
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

const JOB_AUTOMATION_FIELDS = `
  id
  name
  enabled
  keywords
  geoId
  geoLabel
  timeFilter
  workplaceTypes
  experienceLevels
  employmentTypes
  easyApply
  sortBy
  maxResults
  matchCriteria
  intervalMinutes
  nextRunAt
  lastRunAt
  notifyEmail
  sessionInvalid
  createdAt
  updatedAt
`;

const AUTOMATION_RUN_FIELDS = `
  id
  automationId
  startedAt
  finishedAt
  status
  jobsFetched
  jobsMatched
  jobsEmailed
  error
`;

export const JOB_AUTOMATIONS_QUERY = `
  query JobAutomations {
    jobAutomations {
      ${JOB_AUTOMATION_FIELDS}
    }
  }
`;

export const AUTOMATION_RUNS_QUERY = `
  query AutomationRuns($automationId: ID!, $limit: Int, $offset: Int) {
    automationRuns(automationId: $automationId, limit: $limit, offset: $offset) {
      ${AUTOMATION_RUN_FIELDS}
    }
  }
`;

export const LINKEDIN_SESSION_STATUS_QUERY = `
  query LinkedInSessionStatus {
    linkedInSessionStatus {
      configured
      updatedAt
    }
  }
`;

export const CREATE_JOB_AUTOMATION_MUTATION = `
  mutation CreateJobAutomation($input: CreateJobAutomationInput!) {
    createJobAutomation(input: $input) {
      ${JOB_AUTOMATION_FIELDS}
    }
  }
`;

export const UPDATE_JOB_AUTOMATION_MUTATION = `
  mutation UpdateJobAutomation($input: UpdateJobAutomationInput!) {
    updateJobAutomation(input: $input) {
      ${JOB_AUTOMATION_FIELDS}
    }
  }
`;

export const DELETE_JOB_AUTOMATION_MUTATION = `
  mutation DeleteJobAutomation($id: ID!) {
    deleteJobAutomation(id: $id)
  }
`;

export const SAVE_LINKEDIN_SESSION_MUTATION = `
  mutation SaveLinkedInSession($cookie: String!) {
    saveLinkedInSession(cookie: $cookie) {
      configured
      updatedAt
    }
  }
`;

export const CLEAR_LINKEDIN_SESSION_MUTATION = `
  mutation ClearLinkedInSession {
    clearLinkedInSession {
      configured
      updatedAt
    }
  }
`;

export const SYNC_LINKEDIN_APPLICATIONS_NOW_MUTATION = `
  mutation SyncLinkedInApplicationsNow {
    syncLinkedInApplicationsNow {
      synced
      linked
      created
    }
  }
`;

export const RUN_JOB_AUTOMATION_NOW_MUTATION = `
  mutation RunJobAutomationNow($id: ID!) {
    runJobAutomationNow(id: $id) {
      run {
        ${AUTOMATION_RUN_FIELDS}
      }
      matches {
        jobId
        title
        company
        location
        url
      }
    }
  }
`;

export const AUTOMATION_MATCHED_JOB_FIELDS = `
  jobId
  title
  company
  location
  workplaceType
  employmentType
  listedAt
  description
  url
  matchReason
  feedback
  feedbackAt
  runId
  firstMatchedAt
`;

export const AUTOMATION_MATCHES_QUERY = `
  query AutomationMatches($automationId: ID!, $limit: Int, $offset: Int, $feedback: AutomationMatchFeedback) {
    automationMatches(automationId: $automationId, limit: $limit, offset: $offset, feedback: $feedback) {
      ${AUTOMATION_MATCHED_JOB_FIELDS}
    }
  }
`;

export const AUTOMATION_COMPANY_BANS_QUERY = `
  query AutomationCompanyBans {
    automationCompanyBans {
      id
      companyDisplay
      createdAt
    }
  }
`;

export const SET_AUTOMATION_MATCH_FEEDBACK_MUTATION = `
  mutation SetAutomationMatchFeedback($automationId: ID!, $jobId: ID!, $feedback: AutomationMatchFeedback!) {
    setAutomationMatchFeedback(automationId: $automationId, jobId: $jobId, feedback: $feedback) {
      ${AUTOMATION_MATCHED_JOB_FIELDS}
    }
  }
`;

export const BAN_AUTOMATION_COMPANY_MUTATION = `
  mutation BanAutomationCompany($companyName: String!, $sourceJobId: ID, $sourceAutomationId: ID) {
    banAutomationCompany(companyName: $companyName, sourceJobId: $sourceJobId, sourceAutomationId: $sourceAutomationId) {
      id
      companyDisplay
      createdAt
    }
  }
`;

export const UNBAN_AUTOMATION_COMPANY_MUTATION = `
  mutation UnbanAutomationCompany($id: ID!) {
    unbanAutomationCompany(id: $id)
  }
`;
