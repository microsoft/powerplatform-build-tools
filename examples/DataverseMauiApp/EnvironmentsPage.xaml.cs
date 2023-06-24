using System.Windows.Input;

namespace DataverseMauiApp;

public partial class EnvironmentsPage : ContentPage
{
	public EnvironmentsPage(EnvironmentsViewModel viewModel)
	{
    BindingContext = viewModel;
		InitializeComponent();
	}

  protected override async void OnNavigatedTo(NavigatedToEventArgs args)
  {
    base.OnNavigatedTo(args);

    await ViewModel.RefreshAsync().ConfigureAwait(false);
  }

  protected EnvironmentsViewModel ViewModel => BindingContext as EnvironmentsViewModel;
}
