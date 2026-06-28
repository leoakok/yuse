package store

import "github.com/leo/ai-weekend/backend/graph/model"

func (m *Memory) GitHubAccessToken() string {
	return ""
}

func (m *Memory) ConnectionStatus(provider string) (*model.ConnectionStatus, error) {
	return &model.ConnectionStatus{
		Provider:  model.ConnectionProviderGithub,
		Connected: false,
	}, nil
}

func (m *Memory) DisconnectConnection(provider string) (bool, error) {
	return false, nil
}
