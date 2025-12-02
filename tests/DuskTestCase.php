<?php

namespace Tests;

use Facebook\WebDriver\Chrome\ChromeOptions;
use Facebook\WebDriver\Remote\DesiredCapabilities;
use Facebook\WebDriver\Remote\RemoteWebDriver;
use Illuminate\Support\Collection;
use Laravel\Dusk\Browser;
use Laravel\Dusk\TestCase as BaseTestCase;
use PHPUnit\Framework\Attributes\BeforeClass;

abstract class DuskTestCase extends BaseTestCase
{
    #[BeforeClass]
    public static function prepare(): void
    {
        if (env('DUSK_DRIVER_URL')) {
            return;
        }

        if (! static::runningInSail()) {
            static::startChromeDriver(['--port=9515']);
        }
    }

    protected function driver()
    {
        $options = (new ChromeOptions)->addArguments([
            '--window-size=1920,1080',
            '--disable-search-engine-choice-screen',
            '--disable-gpu',
            '--headless=new',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--ignore-certificate-errors'
        ]);

        $capabilities = DesiredCapabilities::chrome();
        $capabilities->setCapability(ChromeOptions::CAPABILITY, $options);

        $logPrefs = ['browser' => 'ALL', 'driver' => 'ALL'];
        $capabilities->setCapability('loggingPrefs', $logPrefs);
        $capabilities->setCapability('goog:loggingPrefs', $logPrefs);

        return RemoteWebDriver::create(
            env('DUSK_DRIVER_URL') ?? 'http://localhost:9515',
            $capabilities,
            60000,
            60000
        );
    }

    /**
     * Capture the failures for the given browsers.
     *
     * @param  Collection  $browsers
     * @return void
     */
    protected function captureFailuresFor($browsers)
    {
        $browsers->each(function ($browser, $key) {
            $source = $browser->driver->getPageSource();
            if ($source) {
                echo "\n--- PAGE SOURCE START ({$key}) ---\n";
                echo $source;
                echo "\n... (truncated) ...\n";
                echo "--- PAGE SOURCE END ---\n";
            }

            $description = $this->toString();
            $filename = str_replace(['\\', ':', ' '], '_', $description);
            $browser->screenshot('failure-'.$filename.'-'.$key);
        });
    }

    protected function setUp(): void
    {
        parent::setUp();

        Browser::$waitSeconds = 15;
    }
}
