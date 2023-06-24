using Microsoft.Identity.Client;
using System;
using System.Collections.ObjectModel;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Windows.Input;

namespace DataverseMauiApp;

public class EnvironmentsViewModel
{
  IPublicClientApplication _publicClient;
  HttpClient _httpClient;

  public EnvironmentsViewModel(IPublicClientApplication publicClient, HttpClient httpClient)
  {
    _publicClient = publicClient ?? throw new ArgumentNullException(nameof(publicClient));
    _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
  }

  internal async Task RefreshAsync()
  {
    // Get auth token
    var scopes = new string[] {
      "https://globaldisco.crm.dynamics.com//.default",
    };
    var authResponse = await _publicClient.AcquireTokenSilent(scopes, PublicClientApplication.OperatingSystemAccount)
      .ExecuteAsync().ConfigureAwait(false);

    // Get environments
    var requestMessage = new HttpRequestMessage(HttpMethod.Get, BuildUrl());
    requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authResponse.AccessToken);

    var httpResponse = await _httpClient.SendAsync(requestMessage);
    var responseContent = await httpResponse.Content.ReadAsStringAsync();
    var responseJson = JsonSerializer.Deserialize<JsonElement>(responseContent);

    Application.Current.Dispatcher.Dispatch(() => UpdateEnvironments(responseJson));
  }

  private void UpdateEnvironments(JsonElement jsonElement)
  {
    Items.Clear();
    foreach (var environment in jsonElement.GetProperty("value").EnumerateArray())
    {
      Items.Add(environment.Deserialize<Environment>());
    }
  }

  private Uri BuildUrl()
  {
    return new Uri($"https://globaldisco.crm.dynamics.com/api/discovery/v2.0/Instances");
  }

  public ObservableCollection<Environment> Items { get; } = new ObservableCollection<Environment>();
}
